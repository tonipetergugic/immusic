import type { NextResponse } from "next/server";
import type { PendingQueueItemRow } from "@/lib/ai/track-check/types";
import { unlink } from "node:fs/promises";
import {
  MAX_TRACK_SECONDS,
  ffprobeDurationSeconds,
  ffmpegDetectSilence,
  ffmpegDetectDcOffsetAbsMean,
  transcodeWavFileToFlac,
  transcodeWavFileToAac_160,
} from "@/lib/audio/ingestTools";
import { markQueueApproved, markQueueRejected } from "@/lib/ai/track-check/queue";
import {
  respondTerminal,
  respondDuplicateAudioJson,
  respondInfraError500AndReset,
  respondWorkerUnhandledError,
  respondQueueDuplicateCheckFailed500,
  respondDuplicateCheckFailed500AndReset,
} from "@/lib/ai/track-check/respond";
import { writeFeedbackIfUnlocked } from "@/lib/ai/track-check/write-feedback-unlocked";
import { bestEffortPersistHardFailReasons } from "@/lib/ai/track-check/persistence";
import { handleExtractFailAndReset } from "@/lib/ai/track-check/extract-fail";
import { extractPrivateMetricsFromTmpWav } from "@/lib/ai/track-check/feature-extraction";
import { persistExtractedMetricsOrFail } from "@/lib/ai/track-check/persist-orchestrator";
import { handlePersistFailAndReset } from "@/lib/ai/track-check/persist-fail";
import { mapExtractToPrivateMetrics } from "@/lib/ai/track-check/metrics-mapping";
import { collectHardFailReasonsFromMetrics } from "@/lib/ai/track-check/hardfail-orchestrator";
import { hardFailRejectTechnical, rejectMissingAudioPath } from "@/lib/ai/track-check/decision";
import { bestEffortRemoveIngestWav } from "@/lib/ai/track-check/cleanup";
import { checkDuplicateAudio } from "@/lib/ai/track-check/duplicate";
import { hasFeedbackUnlock } from "@/lib/ai/track-check/unlock";
import { analyzeAudio } from "@/lib/ai/track-check/analyzer";
import { runCodecSimulationBestEffort } from "@/lib/ai/track-check/codec-simulation";
import { persistCodecSimulationBestEffort } from "@/lib/ai/track-check/codec-sim-persist";
import { ensureQueueAudioHash } from "@/lib/ai/track-check/hash";
import { downloadIngestWavOrFail } from "@/lib/ai/track-check/wav-download";
import { writeTempWavOrFail } from "@/lib/ai/track-check/temp-wav";
import { runAnalysisEngineForAudio } from "@/lib/ai/track-check/engine-runner";
import { writeEngineFeedbackPayload } from "@/lib/ai/track-check/engine-feedback-payload";

function nowNs() {
  return process.hrtime.bigint();
}

function elapsedMs(startNs: bigint) {
  const diffNs = nowNs() - startNs;
  return Number(diffNs) / 1e6;
}

type TechnicalPhaseOk = {
  ok: true;
  audioPath: string;
  title: string | null;
  wavBuf: any;
  audioHash: string | null;
  tmpWavPath: string;
  durationSec: number;
  metrics: {
    integratedLufs: number;
    truePeakDb: number;
    clippedSampleCount: number;
    analyzerMetrics: {
      integratedLufs: number;
      truePeakDbEffective: number;
      clippedSampleCount: number;
      crestFactorDb: number;
      phaseCorrelation: number;
      stereoWidthIndex: number;
      lowEndPhaseCorrelation20_120: number;
      lowEndMonoEnergyLossPct20_120: number;
      lraLu: number;
      transient: {
        punch_index: number;
        transient_density_cv: number;
      };
    };
  };
};

type TechnicalPhaseFail = { ok: false; response: NextResponse };

async function runTechnicalGatesAndPersistMetrics(params: {
  supabase: any;
  admin: any;
  userId: string;
  queueId: string;
  pendingItem: PendingQueueItemRow;
  logStage: (stage: string, ms: number) => void;
  nowNs: () => bigint;
  elapsedMs: (startNs: bigint) => number;
}): Promise<TechnicalPhaseOk | TechnicalPhaseFail> {
  const { supabase, admin, userId, queueId, pendingItem, logStage, nowNs, elapsedMs } = params;

  const audioPath = pendingItem.audio_path as string | null;
  const title = (pendingItem.title as string | null)?.trim() ?? null;

  async function rejectTechnicalHardFail() {
    return await hardFailRejectTechnical({
      supabase,
      userId,
      queueId,
      audioPath,
      hasFeedbackUnlockFn: hasFeedbackUnlock,
    });
  }

  if (!audioPath) {
    const response = await rejectMissingAudioPath({
      supabase,
      userId,
      queueId,
    });
    return { ok: false, response };
  }

  // 3) Download WAV once (reuse for hash + analysis + transcode)
  const dl = await downloadIngestWavOrFail({
    supabase,
    audioPath,
    userId,
    queueId,
    logStage,
    nowNs,
    elapsedMs,
  });

  if (!dl.ok) {
    return { ok: false, response: dl.response };
  }

  const wavBuf = dl.wavBuf;

  const ensured = await ensureQueueAudioHash({
    supabase,
    pendingItem,
    userId,
    wavBuf,
  });

  let audioHash = ensured.audioHash;

  // Safety: reject empty/corrupt (best-effort)
  if (!wavBuf || wavBuf.byteLength <= 0) {
    await markQueueRejected({
      supabase,
      userId,
      queueId,
      reject_reason: "technical",
    });

    const response = await respondTerminal({
      supabase,
      userId,
      queueId,
      decision: "rejected",
    });

    return { ok: false, response };
  }

  const tmp = await writeTempWavOrFail({
    supabase,
    userId,
    queueId,
    wavBuf,
    logStage,
    nowNs,
    elapsedMs,
  });

  if (!tmp.ok) {
    return { ok: false, response: tmp.response };
  }

  const tmpWavPath = tmp.tmpWavPath;

  // 3.2) Hard-fail gate: Duration must be sane and <= 10 minutes (genre-agnostic)
  let durationSec: number;

  try {
    const tProbe = nowNs();
    durationSec = await ffprobeDurationSeconds({ inPath: tmpWavPath });
    logStage("probe_duration", elapsedMs(tProbe));
  } catch {
    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "ffprobe_failed",
    });
    return { ok: false, response };
  }

  // Reject only on clearly broken audio duration
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    const response = await rejectTechnicalHardFail();
    return { ok: false, response };
  }

  // Enforce max track length
  if (durationSec > MAX_TRACK_SECONDS) {
    const response = await rejectTechnicalHardFail();
    return { ok: false, response };
  }

  // 3.3) Hard-fail gate: detect long silence / dropouts (clear technical failure only)
  let silences;

  try {
    const tSilence = nowNs();
    silences = await ffmpegDetectSilence({ inPath: tmpWavPath });
    logStage("detect_silence", elapsedMs(tSilence));
  } catch {
    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "silencedetect_failed",
    });
    return { ok: false, response };
  }

  const longestSilence = silences.reduce((m: number, s: any) => Math.max(m, s.dur), 0);
  const totalSilence = silences.reduce((sum: number, s: any) => sum + s.dur, 0);

  // Reject if we see an obvious dropout (>= 10s silence)
  if (longestSilence >= 10) {
    const response = await rejectTechnicalHardFail();
    return { ok: false, response };
  }

  // Reject if almost entirely silent (>= 95% of the track)
  if (durationSec > 0 && totalSilence / durationSec >= 0.95) {
    const response = await rejectTechnicalHardFail();
    return { ok: false, response };
  }

  // 3.4) Hard-fail gate: extreme DC offset (clear technical failure only)
  let dcAbsMean: number;

  try {
    const tDc = nowNs();
    dcAbsMean = await ffmpegDetectDcOffsetAbsMean({ inPath: tmpWavPath });
    logStage("detect_dc", elapsedMs(tDc));
  } catch {
    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "dc_detect_failed",
    });
    return { ok: false, response };
  }

  // Reject only on extreme cases
  if (dcAbsMean > 0.05) {
    const response = await rejectTechnicalHardFail();
    return { ok: false, response };
  }

  // 3.5 + 3.6) Hard-fail gate: True Peak + Integrated LUFS in ONE ebur128 run
  const extract = await extractPrivateMetricsFromTmpWav({
    tmpWavPath: tmpWavPath!,
    logStage,
    nowNs,
    elapsedMs,
  });

  if (!extract.ok) {
    const response = await handleExtractFailAndReset({
      supabase,
      userId,
      queueId,
      err: extract.err,
    });
    return { ok: false, response };
  }

  const {
    truePeakDb,
    integratedLufs,
    maxSamplePeakDbfs,
    clippedSampleCount,
    crestFactorDb,
    phaseCorrelation,
    midRmsDbfs,
    sideRmsDbfs,
    midSideEnergyRatio,
    stereoWidthIndex,
    lowEndPhaseCorrelation20_120,
    lowEndPhaseCorrelation20_60,
    lowEndPhaseCorrelation60_120,
    lowEndMonoEnergyLossPct20_120,
    spectralSubRmsDbfs,
    spectralLowRmsDbfs,
    spectralLowMidRmsDbfs,
    spectralMidRmsDbfs,
    spectralHighMidRmsDbfs,
    spectralHighRmsDbfs,
    spectralAirRmsDbfs,
    transient,
    lraLu,
    truePeakOvers,
    truePeakOverEvents,
    truePeakDbEffective,
    shortTermLufsTimeline,
  } = mapExtractToPrivateMetrics(extract);

  // Phase 2 (additiv, best-effort): Codec Simulation (MP3 128) for streaming-risk metrics
  // IMPORTANT: Never blocks, never rejects, never changes existing gates/decisions.
  const codecSim = await runCodecSimulationBestEffort({
    tmpWavPath,
    preTruePeakDb: truePeakDbEffective,
    logStage,
    nowNs,
    elapsedMs,
  });

  await persistCodecSimulationBestEffort({
    admin,
    queueId,
    preTruePeakDb: truePeakDbEffective,
    sim: codecSim,
  });

  const persist = await persistExtractedMetricsOrFail({
    admin,
    queueId,
    title,
    durationSec,
    integratedLufs,
    truePeakDbEffective,
    lraLu,
    maxSamplePeakDbfs,
    clippedSampleCount,
    crestFactorDb,
    phaseCorrelation,
    midRmsDbfs,
    sideRmsDbfs,
    midSideEnergyRatio,
    stereoWidthIndex,
    lowEndPhaseCorrelation20_120,
    lowEndPhaseCorrelation20_60,
    lowEndPhaseCorrelation60_120,
    lowEndMonoEnergyLossPct20_120,
    spectralSubRmsDbfs,
    spectralLowRmsDbfs,
    spectralLowMidRmsDbfs,
    spectralMidRmsDbfs,
    spectralHighMidRmsDbfs,
    spectralHighRmsDbfs,
    spectralAirRmsDbfs,
    transient,
    truePeakOvers,
    truePeakOverEvents,
    truePeakDb,
    shortTermLufsTimeline,
  });

  if (!persist.ok) {
    const response = await handlePersistFailAndReset({
      supabase,
      userId,
      queueId,
      persist,
    });
    return { ok: false, response };
  }

  // =============================
  // IMUSIC Gate v2 – Technical Hard-Fail Rules
  // =============================

  const hardFailReasons = collectHardFailReasonsFromMetrics({
    truePeakDbEffective,
    integratedLufs,
    lraLu,
    clippedSampleCount,
    crestFactorDb,
  });

  if (hardFailReasons.length > 0) {
    // Best-effort persistence (never blocks / never throws)
    await bestEffortPersistHardFailReasons({ admin, queueId, reasons: hardFailReasons });

    const response = await rejectTechnicalHardFail();
    return { ok: false, response };
  }

  return {
    ok: true,
    audioPath,
    title,
    wavBuf,
    audioHash: (audioHash as string) ?? null,
    tmpWavPath,
    durationSec,
    metrics: {
      integratedLufs,
      truePeakDb,
      clippedSampleCount,
      analyzerMetrics: {
        integratedLufs,
        truePeakDbEffective,
        clippedSampleCount,
        crestFactorDb,
        phaseCorrelation,
        stereoWidthIndex,
        lowEndPhaseCorrelation20_120,
        lowEndMonoEnergyLossPct20_120,
        lraLu,
        transient: {
          punch_index: transient.punch_index,
          transient_density_cv: transient.transient_density_cv,
        },
      },
    },
  };
}

type ApprovePhaseOk = { ok: true; response: NextResponse };
type ApprovePhaseFail = { ok: false; response: NextResponse };

async function runApproveAndInsertTrack(params: {
  supabase: any;
  admin: any;
  userId: string;
  queueId: string;
  title: string | null;
  version: string | null;
  mainGenre: string | null;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  referenceArtist: string | null;
  referenceTrack: string | null;
  audioPath: string;
  tmpWavPath: string;
  audioHash: string | null;
  durationSec: number;
  integratedLufs: number;
  truePeakDb: number;
  clippedSampleCount: number;
  artistFeedbackPayload: Record<string, unknown> | null;
  logStage: (stage: string, ms: number) => void;
  nowNs: () => bigint;
  elapsedMs: (startNs: bigint) => number;
  setTmpFlacPath: (p: string | null) => void;
  setTmpAacPath: (p: string | null) => void;
}): Promise<ApprovePhaseOk | ApprovePhaseFail> {
  const {
    supabase,
    admin,
    userId,
    queueId,
    title,
    version,
    mainGenre,
    genre,
    bpm,
    key,
    referenceArtist,
    referenceTrack,
    audioPath,
    tmpWavPath,
    audioHash,
    durationSec,
    integratedLufs,
    truePeakDb,
    clippedSampleCount,
    artistFeedbackPayload,
    logStage,
    nowNs,
    elapsedMs,
    setTmpFlacPath,
    setTmpAacPath,
  } = params;

  const safeTitleOut = (title || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const flacPath = `${userId}/${safeTitleOut}-${queueId}.flac`;
  const aacPath = `${userId}/${safeTitleOut}-${queueId}.m4a`;

  async function bestEffortRemoveUploadedFlac() {
    try {
      await supabase.storage.from("track_masters").remove([flacPath]);
    } catch {}
  }

  async function bestEffortRemoveUploadedAac() {
    try {
      await supabase.storage.from("tracks").remove([aacPath]);
    } catch {}
  }

  // APPROVE -> insert track
  if (!title) {
    await supabase
      .from("tracks_ai_queue")
      .update({ status: "rejected", message: null })
      .eq("id", queueId)
      .eq("user_id", userId);

    const response = await respondTerminal({
      supabase,
      userId,
      queueId,
      decision: "rejected",
    });

    return { ok: true, response };
  }

  let flacBytes: Uint8Array;
  try {
    const tTrans = nowNs();
    const out = await transcodeWavFileToFlac({ inPath: tmpWavPath });
    logStage("transcode_flac", elapsedMs(tTrans));
    flacBytes = out.flacBytes;
    setTmpFlacPath(out.outPath);
  } catch {
    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "transcode_failed",
    });
    return { ok: false, response };
  }

  let aacBytes: Uint8Array;
  try {
    const tTrans = nowNs();
    const out = await transcodeWavFileToAac_160({ inPath: tmpWavPath });
    logStage("transcode_aac_160", elapsedMs(tTrans));
    aacBytes = out.aacBytes;
    setTmpAacPath(out.outPath);
  } catch {
    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "transcode_failed",
    });
    return { ok: false, response };
  }

  const tUpFlac = nowNs();
  const { error: flacUpErr } = await supabase.storage
    .from("track_masters")
    .upload(flacPath, new Blob([Buffer.from(flacBytes)], { type: "audio/flac" }), {
      contentType: "audio/flac",
      upsert: false,
    });
  logStage("upload_flac", elapsedMs(tUpFlac));

  if (flacUpErr) {
    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "flac_upload_failed",
    });
    return { ok: false, response };
  }

  const tUpAac = nowNs();
  const { error: aacUpErr } = await supabase.storage
    .from("tracks")
    .upload(aacPath, new Blob([Buffer.from(aacBytes)], { type: "audio/mp4" }), {
      contentType: "audio/mp4",
      upsert: false,
    });
  logStage("upload_aac_160", elapsedMs(tUpAac));

  if (aacUpErr) {
    await bestEffortRemoveUploadedFlac();

    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "aac_upload_failed",
    });
    return { ok: false, response };
  }

  const finalAudioHash = audioHash;

  if (!finalAudioHash) {
    await bestEffortRemoveUploadedAac();
    await bestEffortRemoveUploadedFlac();

    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "missing_audio_hash",
    });
    return { ok: false, response };
  }

  const trackInsert: Record<string, unknown> = {
    artist_id: userId,
    audio_path: aacPath,
    master_audio_path: flacPath,
    title,
    status: "approved",
    source_queue_id: queueId,
    audio_hash: finalAudioHash,
    duration: Math.round(durationSec),
    reference_artist: referenceArtist || null,
    reference_track: referenceTrack || null,
  };

  if (version) {
    trackInsert.version = version;
  }

  if (mainGenre) {
    trackInsert.main_genre = mainGenre;
  }

  if (genre) {
    trackInsert.genre = genre;
  }

  if (typeof bpm === "number" && Number.isInteger(bpm) && bpm > 0) {
    trackInsert.bpm = bpm;
  }

  if (key) {
    trackInsert.key = key;
  }

  const tInsert = nowNs();
  const { error: trackError } = await supabase.from("tracks").insert(trackInsert);
  logStage("insert_track", elapsedMs(tInsert));

  if (trackError) {
    if ((trackError as any).code === "23505") {
      const msg = String((trackError as any).message ?? "");
      const isAudioHashUnique = msg.includes("tracks_audio_hash_unique") || msg.includes("audio_hash");
      const isQueueUnique = msg.includes("tracks_source_queue_id_uq") || msg.includes("source_queue_id");

      if (isAudioHashUnique && !isQueueUnique) {
        await bestEffortRemoveUploadedAac();
        await bestEffortRemoveUploadedFlac();
        await bestEffortRemoveIngestWav({ supabase, audioPath });

        await markQueueRejected({
          supabase,
          userId,
          queueId,
          reject_reason: "duplicate_audio",
        });

        const response = await respondDuplicateAudioJson({
          supabase,
          userId,
          queueId,
        });

        return { ok: true, response };
      }

      await markQueueApproved({
        admin,
        userId,
        queueId,
        audio_path: aacPath,
      });

      await bestEffortRemoveIngestWav({ supabase, audioPath });

      await writeFeedbackIfUnlocked({
        admin,
        userId,
        queueId,
        audioHash: finalAudioHash ?? null,
        decision: "approved",
        integratedLufs,
        truePeakDb,
        clippedSampleCount,
      });

      if (artistFeedbackPayload) {
        await writeEngineFeedbackPayload({
          admin,
          userId,
          queueId,
          audioHash: finalAudioHash ?? null,
          artistFeedbackPayload,
        });
      }

      const response = await respondTerminal({
        supabase,
        userId,
        queueId,
        decision: "approved",
      });

      return { ok: true, response };
    }

    await bestEffortRemoveUploadedAac();
    await bestEffortRemoveUploadedFlac();

    const response = await respondInfraError500AndReset({
      supabase,
      userId,
      queueId,
      error: "track_insert_failed",
    });
    return { ok: false, response };
  }

  await markQueueApproved({
    admin,
    userId,
    queueId,
    audio_path: aacPath,
  });

  await bestEffortRemoveIngestWav({ supabase, audioPath });

  await writeFeedbackIfUnlocked({
    admin,
    userId,
    queueId,
    audioHash: finalAudioHash ?? null,
    decision: "approved",
    integratedLufs,
    truePeakDb,
    clippedSampleCount,
  });

  if (artistFeedbackPayload) {
    await writeEngineFeedbackPayload({
      admin,
      userId,
      queueId,
      audioHash: finalAudioHash ?? null,
      artistFeedbackPayload,
    });
  }

  const response = await respondTerminal({
    supabase,
    userId,
    queueId,
    decision: "approved",
  });

  return { ok: true, response };
}

type DecisionPhaseOk = {
  ok: true;
  audioHash: string | null;
};
type DecisionPhaseFail = { ok: false; response: NextResponse };

async function runDuplicateAndRejectedBranch(params: {
  supabase: any;
  admin: any;
  userId: string;
  queueId: string;
  audioPath: string;
  audioHash: string | null;
  decision: "approved" | "rejected";
  integratedLufs: number;
  truePeakDb: number;
  clippedSampleCount: number;
  artistFeedbackPayload: Record<string, unknown> | null;
}): Promise<DecisionPhaseOk | DecisionPhaseFail> {
  const {
    supabase,
    admin,
    userId,
    queueId,
    audioPath,
    audioHash,
    decision,
    integratedLufs,
    truePeakDb,
    clippedSampleCount,
    artistFeedbackPayload,
  } = params;

  // Global audio dedupe: identical master audio must not enter the system twice
  if (audioHash) {
    const dup = await checkDuplicateAudio({ supabase, audioHash, queueId });

    if (dup.handled && dup.kind === "queue_error") {
      return { ok: false, response: respondQueueDuplicateCheckFailed500() };
    }

    if (dup.handled && dup.kind === "track_error") {
      const response = await respondDuplicateCheckFailed500AndReset({
        supabase,
        userId,
        queueId,
      });
      return { ok: false, response };
    }

    if (dup.handled && dup.kind === "duplicate_audio") {
      // Cleanup WAV (best-effort) to avoid ingest leftovers
      await bestEffortRemoveIngestWav({ supabase, audioPath });

      await markQueueRejected({
        supabase,
        userId,
        queueId,
        reject_reason: "duplicate_audio",
      });

      const response = await respondDuplicateAudioJson({
        supabase,
        userId,
        queueId,
      });

      return { ok: false, response };
    }
  }

  if (decision === "rejected") {
    // Cleanup WAV (best-effort). Rejects must not leave ingest artifacts behind.
    await bestEffortRemoveIngestWav({ supabase, audioPath });

    await markQueueRejected({
      supabase,
      userId,
      queueId,
      reject_reason: "technical",
    });

    await writeFeedbackIfUnlocked({
      admin,
      userId,
      queueId,
      audioHash: audioHash ?? null,
      decision: "rejected",
      integratedLufs,
      truePeakDb,
      clippedSampleCount,
    });

    if (artistFeedbackPayload) {
      await writeEngineFeedbackPayload({
        admin,
        userId,
        queueId,
        audioHash: audioHash ?? null,
        artistFeedbackPayload,
      });
    }

    const response = await respondTerminal({
      supabase,
      userId,
      queueId,
      decision: "rejected",
    });

    return { ok: false, response };
  }

  return { ok: true, audioHash: audioHash ?? null };
}

export async function runTrackCheckWorker(params: {
  supabase: any;
  admin: any;
  user: { id: string };
  pendingItem: PendingQueueItemRow;
}): Promise<NextResponse> {
  const { supabase, admin, user, pendingItem } = params;

  const queueId = pendingItem.id as string;

  // --- PERF BASELINE (console only) ---
  const tTotal = nowNs();

  function logStage(_stage: string, _ms: number) {}
  // --- PERF BASELINE (console only) ---

  let tmpWavPath: string | null = null;
  let tmpFlacPath: string | null = null;
  let tmpAacPath: string | null = null;

  try {
    const tech = await runTechnicalGatesAndPersistMetrics({
      supabase,
      admin,
      userId: user.id,
      queueId,
      pendingItem,
      logStage,
      nowNs,
      elapsedMs,
    });

    if (!tech.ok) {
      return tech.response;
    }

    const { audioPath, title, wavBuf, tmpWavPath: tmpWavPathFromTech, durationSec } = tech;
    let audioHash = tech.audioHash;
    const { integratedLufs, truePeakDb, clippedSampleCount, analyzerMetrics } = tech.metrics;
    tmpWavPath = tmpWavPathFromTech;
    let artistFeedbackPayload: Record<string, unknown> | null = null;

    if (process.env.IMMUSIC_ANALYSIS_ENGINE_SIDECAR === "1") {
      try {
        const tAnalysisEngine = nowNs();
        const engineResult = await runAnalysisEngineForAudio({
          audioPath: tmpWavPathFromTech,
          trackId: queueId,
        });

        if (engineResult.ok) {
          artistFeedbackPayload = engineResult.artistFeedbackPayload;
        }
        logStage("analysis_engine_sidecar", elapsedMs(tAnalysisEngine));
      } catch (err) {
        console.warn("analysis_engine_sidecar_failed", err);
      }
    }

    const tAnalyze = nowNs();
    const decision = await analyzeAudio(analyzerMetrics);
    logStage("analyze", elapsedMs(tAnalyze));

    const decisionPhase = await runDuplicateAndRejectedBranch({
      supabase,
      admin,
      userId: user.id,
      queueId,
      audioPath,
      audioHash,
      decision,
      integratedLufs,
      truePeakDb,
      clippedSampleCount,
      artistFeedbackPayload,
    });

    if (!decisionPhase.ok) {
      return decisionPhase.response;
    }

    audioHash = decisionPhase.audioHash;

    const queueVersion =
      typeof pendingItem.version === "string" && pendingItem.version.trim()
        ? pendingItem.version.trim()
        : null;

    const queueMainGenre =
      typeof pendingItem.main_genre === "string" && pendingItem.main_genre.trim()
        ? pendingItem.main_genre.trim()
        : null;

    const queueGenre =
      typeof pendingItem.genre === "string" && pendingItem.genre.trim()
        ? pendingItem.genre.trim()
        : null;

    const queueBpm =
      typeof pendingItem.bpm === "number" && Number.isInteger(pendingItem.bpm)
        ? pendingItem.bpm
        : null;

    const queueKey =
      typeof pendingItem.key === "string" && pendingItem.key.trim()
        ? pendingItem.key.trim()
        : null;

    const queueReferenceArtist =
      typeof pendingItem.reference_artist === "string" && pendingItem.reference_artist.trim()
        ? pendingItem.reference_artist.trim()
        : null;

    const queueReferenceTrack =
      typeof pendingItem.reference_track === "string" && pendingItem.reference_track.trim()
        ? pendingItem.reference_track.trim()
        : null;

    const approve = await runApproveAndInsertTrack({
      supabase,
      admin,
      userId: user.id,
      queueId,
      title,
      version: queueVersion,
      mainGenre: queueMainGenre,
      genre: queueGenre,
      bpm: queueBpm,
      key: queueKey,
      referenceArtist: queueReferenceArtist,
      referenceTrack: queueReferenceTrack,
      audioPath,
      tmpWavPath: tmpWavPath!,
      audioHash,
      durationSec,
      integratedLufs,
      truePeakDb,
      clippedSampleCount,
      artistFeedbackPayload,
      logStage,
      nowNs,
      elapsedMs,
      setTmpFlacPath: (p) => {
        tmpFlacPath = p;
      },
      setTmpAacPath: (p) => {
        tmpAacPath = p;
      },
    });

    return approve.response;
  } catch {
    return await respondWorkerUnhandledError({
      supabase,
      userId: user.id,
      queueId,
    });
  } finally {
    try {
      logStage("total", elapsedMs(tTotal));
    } catch {}

    try {
      if (tmpWavPath) await unlink(tmpWavPath);
    } catch {}
    try {
      if (tmpFlacPath) await unlink(tmpFlacPath);
    } catch {}

    try {
      if (tmpAacPath) await unlink(tmpAacPath);
    } catch {}
  }
}
