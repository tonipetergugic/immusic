import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { unlink } from "node:fs/promises";
import {
  MAX_TRACK_SECONDS,
  sha256HexFromArrayBuffer,
  ffprobeDurationSeconds,
  ffmpegDetectSilence,
  ffmpegDetectDcOffsetAbsMean,
  ffmpegDetectTruePeakAndIntegratedLufs,
  ffmpegDetectLoudnessRangeLu,
  ffmpegDetectTruePeakOvers,
  ffmpegDetectTruePeakOversEvents,
  ffmpegDetectMaxSamplePeakDbfs,
  ffmpegDetectRmsLevelDbfs,
  ffmpegDetectClippedSampleCount,
  ffmpegDetectPhaseCorrelation,
  ffmpegDetectRmsDbfsWithPan,
  ffmpegDetectBandRmsDbfs,
  ffmpegDetectTransientPunchMetrics,
  transcodeWavFileToMp3_320,
  writeTempWav,
  type TransientPunchMetrics,
} from "@/lib/audio/ingestTools";
import { buildFeedbackPayloadV2Mvp, type FeedbackPayloadV2 } from "@/lib/ai/feedbackPayloadV2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AI_DEBUG = process.env.AI_DEBUG === "1";

type Decision = "approved" | "rejected";

/**
 * Minimaler Analyzer-Stub (DSP kommt später).
 * IMPORTANT: keinerlei Messwerte/Fail-Codes zurückgeben (Anti-Leak).
 * Für jetzt: immer approved.
 */
async function analyzeAudioStub(_wavBuffer: ArrayBuffer): Promise<Decision> {
  // DSP kommt später. Anti-Leak: keinerlei Messwerte/Fail-Codes zurückgeben.
  return "approved";
}
 


async function hasFeedbackUnlock(supabase: any, userId: string, queueId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("track_ai_feedback_unlocks")
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.id;
}
 
async function writeFeedbackPayloadIfUnlocked(params: {
  admin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  queueId: string;
  audioHash: string;
  decision: Decision;
  integratedLufs: number | null;
  truePeakDbTp: number | null;
  clippedSampleCount: number | null;
}) {
  const { admin, userId, queueId, audioHash, decision, integratedLufs, truePeakDbTp, clippedSampleCount } = params;

  // Always use queue.audio_hash as source of truth (unlock and payload must bind to queue hash)
  const adminClient = admin as any;
  const { data: queueRow, error: queueErr } = await adminClient
    .from("tracks_ai_queue")
    .select("audio_hash")
    .eq("id", queueId)
    .maybeSingle();

  const queueAudioHash = queueRow?.audio_hash ?? null;
  if (queueErr || !queueAudioHash) {
    if (AI_DEBUG) console.log("[PAYLOAD DEBUG] abort: queue hash missing", {
      queueId,
      queueErr: queueErr ? String((queueErr as any).message ?? queueErr) : null,
      queueAudioHash,
    });
    return;
  }

  // Only write payload if user has paid unlock (anti-leak + cost control)
  const { data: unlock, error: unlockErr } = await adminClient
    // Database typing may not include this table yet -> avoid "never" inference
    .from("track_ai_feedback_unlocks" as any)
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .eq("audio_hash", queueAudioHash)
    .maybeSingle();

  const unlockRow = unlock as { id?: string } | null;

  if (unlockErr || !unlockRow?.id) {
    if (AI_DEBUG) console.log("[PAYLOAD DEBUG] abort: unlock missing", {
      queueId,
      userId,
      queueAudioHash,
      unlockErr: unlockErr ? String((unlockErr as any).message ?? unlockErr) : null,
      unlockFound: Boolean(unlockRow?.id),
    });
    return;
  }

  // Source of truth: build payload from persisted private metrics (not from passed-in params)
  const { data: mRow, error: mErr } = await adminClient
    .from("track_ai_private_metrics")
    .select(
      [
        "integrated_lufs",
        "true_peak_db_tp",
        "loudness_range_lu",
        "crest_factor_db",
        "phase_correlation",
        "mid_rms_dbfs",
        "side_rms_dbfs",
        "mid_side_energy_ratio",
        "stereo_width_index",
        "spectral_sub_rms_dbfs",
        "spectral_low_rms_dbfs",
        "spectral_lowmid_rms_dbfs",
        "spectral_mid_rms_dbfs",
        "spectral_highmid_rms_dbfs",
        "spectral_high_rms_dbfs",
        "spectral_air_rms_dbfs",
        "clipped_sample_count",
        "mean_short_crest_db",
        "p95_short_crest_db",
        "transient_density",
        "punch_index",
        "true_peak_overs",
      ].join(",")
    )
    .eq("queue_id", queueId)
    .maybeSingle();

  if (mErr || !mRow) {
    if (AI_DEBUG) console.log("[PAYLOAD DEBUG] abort: private metrics missing", {
      queueId,
      userId,
      queueAudioHash,
      mErr: mErr ? String((mErr as any).message ?? mErr) : null,
      found: Boolean(mRow),
    });
    return;
  }

  const m = mRow as any;

  const truePeakOversSoT =
    Array.isArray(m.true_peak_overs) ? (m.true_peak_overs as any[]) : [];

  // Map stored events (db shape) -> FeedbackEventV2
  const truePeakOversEvents =
    truePeakOversSoT
      .map((ev) => {
        const t0 = Number((ev as any).t0);
        const t1 = Number((ev as any).t1);
        const peak = Number((ev as any).peak_db_tp);
        const sevRaw = String((ev as any).severity || "");
        const severity: "info" | "warn" | "critical" =
          sevRaw === "critical" ? "critical" : "warn";

        if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return null;
        if (!Number.isFinite(peak)) return null;

        return {
          t0,
          t1,
          severity,
          message: "True Peak over 0.0 dBTP",
          value: peak,
          unit: "dBTP",
        };
      })
      .filter(Boolean) as any[];

  const integratedLufsSoT =
    typeof m.integrated_lufs === "number" && Number.isFinite(m.integrated_lufs) ? m.integrated_lufs : null;

  const truePeakDbTpSoT =
    typeof m.true_peak_db_tp === "number" && Number.isFinite(m.true_peak_db_tp) ? m.true_peak_db_tp : null;

  const clippedSampleCountSoT =
    typeof m.clipped_sample_count === "number" && Number.isFinite(m.clipped_sample_count) && m.clipped_sample_count >= 0
      ? Math.trunc(m.clipped_sample_count)
      : null;

  const payload: FeedbackPayloadV2 = buildFeedbackPayloadV2Mvp({
    queueId,
    audioHash: queueAudioHash,
    decision,
    integratedLufs: integratedLufsSoT,
    truePeakDbTp: truePeakDbTpSoT,
    clippedSampleCount: clippedSampleCountSoT,
    truePeakOversEvents,

    crestFactorDb: typeof m.crest_factor_db === "number" && Number.isFinite(m.crest_factor_db) ? m.crest_factor_db : null,
    loudnessRangeLu: typeof m.loudness_range_lu === "number" && Number.isFinite(m.loudness_range_lu) ? m.loudness_range_lu : null,

    phaseCorrelation: typeof m.phase_correlation === "number" && Number.isFinite(m.phase_correlation) ? m.phase_correlation : null,
    midRmsDbfs: typeof m.mid_rms_dbfs === "number" && Number.isFinite(m.mid_rms_dbfs) ? m.mid_rms_dbfs : null,
    sideRmsDbfs: typeof m.side_rms_dbfs === "number" && Number.isFinite(m.side_rms_dbfs) ? m.side_rms_dbfs : null,
    midSideEnergyRatio: typeof m.mid_side_energy_ratio === "number" && Number.isFinite(m.mid_side_energy_ratio) ? m.mid_side_energy_ratio : null,
    stereoWidthIndex: typeof m.stereo_width_index === "number" && Number.isFinite(m.stereo_width_index) ? m.stereo_width_index : null,

    spectralSubRmsDbfs: typeof m.spectral_sub_rms_dbfs === "number" && Number.isFinite(m.spectral_sub_rms_dbfs) ? m.spectral_sub_rms_dbfs : null,
    spectralLowRmsDbfs: typeof m.spectral_low_rms_dbfs === "number" && Number.isFinite(m.spectral_low_rms_dbfs) ? m.spectral_low_rms_dbfs : null,
    spectralLowMidRmsDbfs: typeof m.spectral_lowmid_rms_dbfs === "number" && Number.isFinite(m.spectral_lowmid_rms_dbfs) ? m.spectral_lowmid_rms_dbfs : null,
    spectralMidRmsDbfs: typeof m.spectral_mid_rms_dbfs === "number" && Number.isFinite(m.spectral_mid_rms_dbfs) ? m.spectral_mid_rms_dbfs : null,
    spectralHighMidRmsDbfs: typeof m.spectral_highmid_rms_dbfs === "number" && Number.isFinite(m.spectral_highmid_rms_dbfs) ? m.spectral_highmid_rms_dbfs : null,
    spectralHighRmsDbfs: typeof m.spectral_high_rms_dbfs === "number" && Number.isFinite(m.spectral_high_rms_dbfs) ? m.spectral_high_rms_dbfs : null,
    spectralAirRmsDbfs: typeof m.spectral_air_rms_dbfs === "number" && Number.isFinite(m.spectral_air_rms_dbfs) ? m.spectral_air_rms_dbfs : null,

    meanShortCrestDb: typeof m.mean_short_crest_db === "number" && Number.isFinite(m.mean_short_crest_db) ? m.mean_short_crest_db : null,
    p95ShortCrestDb: typeof m.p95_short_crest_db === "number" && Number.isFinite(m.p95_short_crest_db) ? m.p95_short_crest_db : null,
    transientDensity: typeof m.transient_density === "number" && Number.isFinite(m.transient_density) ? m.transient_density : null,
    punchIndex: typeof m.punch_index === "number" && Number.isFinite(m.punch_index) ? m.punch_index : null,
  });

  if (AI_DEBUG) console.log("[PAYLOAD DEBUG] built payload (SoT metrics):", {
    queueId,
    queueAudioHash,
    integratedLufsSoT,
    truePeakDbTpSoT,
    lraSoT: typeof m.loudness_range_lu === "number" ? m.loudness_range_lu : null,
    crestSoT: typeof m.crest_factor_db === "number" ? m.crest_factor_db : null,
  });

  const { data: existingPayload } = await adminClient
    .from("track_ai_feedback_payloads")
    .select("id")
    .eq("queue_id", queueId)
    .maybeSingle();

  if (existingPayload?.id) {
    await adminClient
      .from("track_ai_feedback_payloads")
      .update({
        user_id: userId,
        audio_hash: queueAudioHash,
        payload_version: 2,
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq("queue_id", queueId);
  } else {
    await adminClient
      .from("track_ai_feedback_payloads")
      .insert({
        queue_id: queueId,
        user_id: userId,
        audio_hash: queueAudioHash,
        payload_version: 2,
        payload,
      });
  }
}

type TerminalDecision = {
  ok: true;
  processed: true;
  decision: Decision;
  feedback_available: boolean;
  queue_id: string;
  reason?: string;
};

function jsonTerminal(decision: TerminalDecision) {
  return NextResponse.json(decision);
}

async function markQueueRejected(params: {
  supabase: any;
  userId: string;
  queueId: string;
  reject_reason: "technical" | "duplicate_audio";
}) {
  await params.supabase
    .from("tracks_ai_queue")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      reject_reason: params.reject_reason,
      message: null,
    })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);
}

async function markQueueApproved(params: {
  supabase: any;
  userId: string;
  queueId: string;
  audio_path: string;
}) {
  await params.supabase
    .from("tracks_ai_queue")
    .update({ status: "approved", message: null, audio_path: params.audio_path })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);
}

async function resetQueueToPending(params: {
  supabase: any;
  userId: string;
  queueId: string;
}) {
  await params.supabase
    .from("tracks_ai_queue")
    .update({ status: "pending", message: null })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);
}

async function bestEffortRemoveIngestWav(params: {
  supabase: any;
  audioPath: string | null;
}) {
  try {
    if (params.audioPath) {
      await params.supabase.storage.from("ingest_wavs").remove([params.audioPath]);
    }
  } catch {}
}

async function hardFailRejectTechnical(params: {
  supabase: any;
  userId: string;
  queueId: string;
  audioPath: string | null;
  hasFeedbackUnlockFn: (supabase: any, userId: string, queueId: string) => Promise<boolean>;
}) {
  await bestEffortRemoveIngestWav({ supabase: params.supabase, audioPath: params.audioPath });

  await markQueueRejected({
    supabase: params.supabase,
    userId: params.userId,
    queueId: params.queueId,
    reject_reason: "technical",
  });

  const unlocked = await params.hasFeedbackUnlockFn(params.supabase, params.userId, params.queueId);

  return jsonTerminal({
    ok: true,
    processed: true,
    decision: "rejected",
    feedback_available: unlocked,
    queue_id: params.queueId,
  });
}

function nowNs() {
  return process.hrtime.bigint();
}

function elapsedMs(startNs: bigint) {
  const diffNs = nowNs() - startNs;
  return Number(diffNs) / 1e6;
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Step 65: Auto-recover stuck processing items (self-healing, user-scoped)
  // If a previous run crashed after claiming, don't leave the queue blocked forever.
  // We only reset rows older than 10 minutes to avoid interfering with an active run.
  await supabase
    .from("tracks_ai_queue")
    .update({ status: "pending", message: null })
    .eq("user_id", user.id)
    .eq("status", "processing")
    .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  // 1) Find oldest pending queue item for this user
  const { data: pendingItem, error: fetchErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, audio_path, title, status, hash_status, audio_hash")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 });
  }

  if (!pendingItem) {
    // No pending items to process.
    // (Hashing is no longer a prerequisite; analysis runs first.)
    // Continue with terminal-state lookup below.

    // If there is no pending item, check the most recent terminal state (approved/rejected)
    const { data: lastItem, error: lastErr } = await supabase
      .from("tracks_ai_queue")
      .select("id, status, audio_hash")
      .eq("user_id", user.id)
      .in("status", ["approved", "rejected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastErr && lastItem?.status === "approved") {
      const unlocked = await hasFeedbackUnlock(supabase, user.id, lastItem.id);

      const finalAudioHash = (lastItem as any).audio_hash as string | null;
      if (finalAudioHash) {
        await writeFeedbackPayloadIfUnlocked({
          admin,
          userId: user.id,
          queueId: lastItem.id,
          audioHash: finalAudioHash,
          decision: "approved",
          integratedLufs: null,
          truePeakDbTp: null,
          clippedSampleCount: null,
        });
      }

      return jsonTerminal({
        ok: true,
        processed: true,
        decision: "approved",
        feedback_available: unlocked,
        queue_id: lastItem.id,
      });
    }

    if (!lastErr && lastItem?.status === "rejected") {
      const unlocked = await hasFeedbackUnlock(supabase, user.id, lastItem.id);

      const finalAudioHash = (lastItem as any).audio_hash as string | null;
      if (finalAudioHash) {
        await writeFeedbackPayloadIfUnlocked({
          admin,
          userId: user.id,
          queueId: lastItem.id,
          audioHash: finalAudioHash,
          decision: "rejected",
          integratedLufs: null,
          truePeakDbTp: null,
          clippedSampleCount: null,
        });
      }

      return jsonTerminal({
        ok: true,
        processed: true,
        decision: "rejected",
        feedback_available: unlocked,
        queue_id: lastItem.id,
      });
    }

    return NextResponse.json({ ok: true, processed: false, reason: "idle" });
  }

  // 2) Claim atomically-ish: pending -> processing (avoid double-processing)
  const { data: claimRows, error: claimErr } = await supabase
    .from("tracks_ai_queue")
    .update({ status: "processing" })
    .eq("id", pendingItem.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id")
    .limit(1);

  if (claimErr) {
    return NextResponse.json({ ok: false, error: "queue_claim_failed" }, { status: 500 });
  }

  if (!claimRows || claimRows.length === 0) {
    return NextResponse.json({ ok: true, processed: false, reason: "already_claimed" });
  }

  const queueId = pendingItem.id as string;

  // --- PERF BASELINE (console only) ---
  const timings: Record<string, number> = {};
  const tTotal = nowNs();
  const PERF_ON = process.env.AI_CHECK_TIMING === "1";

  function logStage(stage: string, ms: number) {
    timings[stage] = ms;
    if (!PERF_ON) return;
    // keep logs compact and greppable
    console.log(`[AI-CHECK] queue=${queueId} stage=${stage} ms=${ms.toFixed(1)}`);
  }
  // --- PERF BASELINE (console only) ---

  let tmpWavPath: string | null = null;
  let tmpMp3Path: string | null = null;

  try {
    const audioPath = pendingItem.audio_path as string | null;
    const title = (pendingItem.title as string | null)?.trim() ?? null;

    if (!audioPath) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return jsonTerminal({
        ok: true,
        processed: true,
        decision: "rejected",
        feedback_available: unlocked,
        queue_id: queueId,
      });
    }

    // 3) Download WAV once (reuse for hash + analysis + transcode)
    const tDl = nowNs();
    const { data: wavBlob, error: wavDlErr } = await supabase.storage
      .from("ingest_wavs")
      .download(audioPath);
    logStage("download_wav", elapsedMs(tDl));

    if (wavDlErr || !wavBlob) {
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json(
        { ok: false, error: "wav_download_failed" },
        { status: 500 }
      );
    }

    const wavBuf = await wavBlob.arrayBuffer();

    // Ensure audio_hash exists ASAP (required for paid feedback unlock even on hard-fail rejects)
    // Do this before any terminal return paths.
    let audioHash = pendingItem.audio_hash as string | null;

    if (!audioHash) {
      try {
        audioHash = await sha256HexFromArrayBuffer(wavBuf);

        await supabase
          .from("tracks_ai_queue")
          .update({
            audio_hash: audioHash,
            hash_status: "done",
            hashed_at: new Date().toISOString(),
            hash_last_error: null,
          })
          .eq("id", pendingItem.id)
          .eq("user_id", user.id);
      } catch {
        // Hash failure should not hard-reject user audio, but it will block unlock (action will show waiting_for_hash)
        await supabase
          .from("tracks_ai_queue")
          .update({
            hash_status: "error",
            hash_attempts: ((pendingItem as any).hash_attempts ?? 0) + 1,
            hash_last_error: "hash_failed",
          })
          .eq("id", pendingItem.id)
          .eq("user_id", user.id);
      }
    }

    // Safety: reject empty/corrupt (best-effort)
    if (!wavBuf || wavBuf.byteLength <= 0) {
      await markQueueRejected({
        supabase,
        userId: user.id,
        queueId,
        reject_reason: "technical",
      });

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return jsonTerminal({
        ok: true,
        processed: true,
        decision: "rejected",
        feedback_available: unlocked,
        queue_id: queueId,
      });
    }

    try {
      const tTmp = nowNs();
      tmpWavPath = await writeTempWav({ wavBuf });
      logStage("write_temp_wav", elapsedMs(tTmp));
    } catch {
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json(
        { ok: false, error: "tmp_wav_write_failed" },
        { status: 500 }
      );
    }

    // 3.2) Hard-fail gate: Duration must be sane and <= 10 minutes (genre-agnostic)
    let durationSec: number;

    try {
      const tProbe = nowNs();
      durationSec = await ffprobeDurationSeconds({ inPath: tmpWavPath });
      logStage("probe_duration", elapsedMs(tProbe));
    } catch {
      // Infra/runtime issue (ffprobe missing/crashed) => do NOT reject user audio.
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json(
        { ok: false, error: "ffprobe_failed" },
        { status: 500 }
      );
    }

    // Reject only on clearly broken audio duration
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      return await hardFailRejectTechnical({
        supabase,
        userId: user.id,
        queueId,
        audioPath,
        hasFeedbackUnlockFn: hasFeedbackUnlock,
      });
    }

    // Enforce max track length
    if (durationSec > MAX_TRACK_SECONDS) {
      return await hardFailRejectTechnical({
        supabase,
        userId: user.id,
        queueId,
        audioPath,
        hasFeedbackUnlockFn: hasFeedbackUnlock,
      });
    }

    // 3.3) Hard-fail gate: detect long silence / dropouts (clear technical failure only)
    let silences;

    try {
      const tSilence = nowNs();
      silences = await ffmpegDetectSilence({ inPath: tmpWavPath });
      logStage("detect_silence", elapsedMs(tSilence));
    } catch {
      // Infra/runtime issue => do NOT reject user audio.
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json(
        { ok: false, error: "silencedetect_failed" },
        { status: 500 }
      );
    }

    const longestSilence = silences.reduce((m, s) => Math.max(m, s.dur), 0);
    const totalSilence = silences.reduce((sum, s) => sum + s.dur, 0);

    // Reject if we see an obvious dropout (>= 10s silence)
    if (longestSilence >= 10) {
      return await hardFailRejectTechnical({
        supabase,
        userId: user.id,
        queueId,
        audioPath,
        hasFeedbackUnlockFn: hasFeedbackUnlock,
      });
    }

    // Reject if almost entirely silent (>= 95% of the track)
    if (durationSec > 0 && totalSilence / durationSec >= 0.95) {
      return await hardFailRejectTechnical({
        supabase,
        userId: user.id,
        queueId,
        audioPath,
        hasFeedbackUnlockFn: hasFeedbackUnlock,
      });
    }

    // 3.4) Hard-fail gate: extreme DC offset (clear technical failure only)
    let dcAbsMean: number;

    try {
      const tDc = nowNs();
      dcAbsMean = await ffmpegDetectDcOffsetAbsMean({ inPath: tmpWavPath });
      logStage("detect_dc", elapsedMs(tDc));
    } catch {
      // Infra/runtime issue => do NOT reject user audio.
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json(
        { ok: false, error: "dc_detect_failed" },
        { status: 500 }
      );
    }

    // Reject only on extreme cases
    if (dcAbsMean > 0.05) {
      return await hardFailRejectTechnical({
        supabase,
        userId: user.id,
        queueId,
        audioPath,
        hasFeedbackUnlockFn: hasFeedbackUnlock,
      });
    }

    // 3.5 + 3.6) Hard-fail gate: True Peak + Integrated LUFS in ONE ebur128 run
    let truePeakDb: number;
    let integratedLufs: number;
    let maxSamplePeakDbfs: number;
    let clippedSampleCount: number;
    let crestFactorDb: number = NaN;
    let phaseCorrelation: number;
    let midRmsDbfs: number = NaN;
    let sideRmsDbfs: number = NaN;
    let midSideEnergyRatio: number = NaN;
    let stereoWidthIndex: number = NaN;
    let spectralSubRmsDbfs: number = NaN;
    let spectralLowRmsDbfs: number = NaN;
    let spectralLowMidRmsDbfs: number = NaN;
    let spectralMidRmsDbfs: number = NaN;
    let spectralHighMidRmsDbfs: number = NaN;
    let spectralHighRmsDbfs: number = NaN;
    let spectralAirRmsDbfs: number = NaN;
    let lraLu: number = NaN;
    let truePeakOvers: Array<{ t0: number; t1: number; peak_db_tp: number }> = [];
    let truePeakOverEvents: Array<{ t0: number; t1: number; peak_db_tp: number; severity: "warn" | "critical" }> = [];
    let truePeakDbEffective: number = NaN;
    let transient: TransientPunchMetrics = {
      mean_short_rms_dbfs: NaN,
      p95_short_rms_dbfs: NaN,
      mean_short_peak_dbfs: NaN,
      p95_short_peak_dbfs: NaN,
      mean_short_crest_db: NaN,
      p95_short_crest_db: NaN,
      transient_density: NaN,
      punch_index: NaN,
    };

    try {
      const tEbur = nowNs();
      const r = await ffmpegDetectTruePeakAndIntegratedLufs({ inPath: tmpWavPath });
      logStage("detect_true_peak_lufs", elapsedMs(tEbur));
      truePeakDb = r.truePeakDbTp;
      integratedLufs = r.integratedLufs;
      maxSamplePeakDbfs = await ffmpegDetectMaxSamplePeakDbfs({ inPath: tmpWavPath });
      const clippedSampleCountRaw = await ffmpegDetectClippedSampleCount({ inPath: tmpWavPath });
      clippedSampleCount =
        Number.isFinite(clippedSampleCountRaw) && clippedSampleCountRaw >= 0
          ? Math.trunc(clippedSampleCountRaw)
          : 0;

      const rmsDbfs = await ffmpegDetectRmsLevelDbfs({ inPath: tmpWavPath });
      crestFactorDb =
        Number.isFinite(truePeakDb) && Number.isFinite(rmsDbfs) ? truePeakDb - rmsDbfs : NaN;

      const phaseCorrelationRaw = await ffmpegDetectPhaseCorrelation({ inPath: tmpWavPath });
      phaseCorrelation = phaseCorrelationRaw;

      midRmsDbfs = await ffmpegDetectRmsDbfsWithPan({
        inPath: tmpWavPath,
        panExpr: "mono|c0=0.5*c0+0.5*c1",
      });

      sideRmsDbfs = await ffmpegDetectRmsDbfsWithPan({
        inPath: tmpWavPath,
        panExpr: "mono|c0=0.5*c0-0.5*c1",
      });

      // Energy ratio based on linear RMS (not dB): side_energy / mid_energy
      const midLin = Number.isFinite(midRmsDbfs) ? Math.pow(10, midRmsDbfs / 20) : NaN;
      const sideLin = Number.isFinite(sideRmsDbfs) ? Math.pow(10, sideRmsDbfs / 20) : NaN;

      midSideEnergyRatio =
        Number.isFinite(midLin) && Number.isFinite(sideLin) && midLin > 0
          ? (sideLin * sideLin) / (midLin * midLin)
          : NaN;

      // Stereo width index: normalized side vs total energy [0..1]
      stereoWidthIndex =
        Number.isFinite(midLin) && Number.isFinite(sideLin) && midLin >= 0 && sideLin >= 0
          ? (sideLin * sideLin) / ((midLin * midLin) + (sideLin * sideLin) + 1e-12)
          : NaN;

      // Spectral band RMS (dBFS) - genre-agnostic, deterministic
      spectralSubRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: tmpWavPath, fLowHz: 20, fHighHz: 60 });
      spectralLowRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: tmpWavPath, fLowHz: 60, fHighHz: 200 });
      spectralLowMidRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: tmpWavPath, fLowHz: 200, fHighHz: 500 });
      spectralMidRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: tmpWavPath, fLowHz: 500, fHighHz: 2000 });
      spectralHighMidRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: tmpWavPath, fLowHz: 2000, fHighHz: 6000 });
      spectralHighRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: tmpWavPath, fLowHz: 6000, fHighHz: 12000 });
      spectralAirRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: tmpWavPath, fLowHz: 12000, fHighHz: 16000 });

      transient = await ffmpegDetectTransientPunchMetrics({ inPath: tmpWavPath });

      lraLu = await ffmpegDetectLoudnessRangeLu({ inPath: tmpWavPath });

      // Timecoded True Peak Overs (windowed, oversampled SR)
      truePeakOvers = await ffmpegDetectTruePeakOvers({ inPath: tmpWavPath });

      truePeakOverEvents = await ffmpegDetectTruePeakOversEvents({ inPath: tmpWavPath, thresholdDbTp: 0.0 });

      // Compute effective True Peak from both the measured true peak and any detected overs events.
      // IMPORTANT: must match the persisted DB shape: { t0, t1, peak_db_tp }
      const maxOverDbTp =
        Array.isArray(truePeakOverEvents)
          ? truePeakOverEvents.reduce((acc: number, ev: any) => {
              const v = Number(ev?.peak_db_tp);
              return Number.isFinite(v) ? Math.max(acc, v) : acc;
            }, -Infinity)
          : -Infinity;

      truePeakDbEffective =
        Number.isFinite(maxOverDbTp) ? Math.max(truePeakDb, maxOverDbTp) : truePeakDb;

      if (AI_DEBUG) {
        console.log("[AI-CHECK] LUFS:", integratedLufs);
        console.log("[AI-CHECK] TruePeak:", truePeakDb);
        console.log("[AI-CHECK] LRA (LU):", lraLu);
      }
      if (process.env.AI_DEBUG === "1") {
        console.log("[AI-CHECK] RMS dBFS:", rmsDbfs);
        console.log("[AI-CHECK] Crest dB:", crestFactorDb);

        console.log("[AI-CHECK] PhaseCorr:", phaseCorrelation);
        console.log("[AI-CHECK] Mid RMS dBFS:", midRmsDbfs);
        console.log("[AI-CHECK] Side RMS dBFS:", sideRmsDbfs);
        console.log("[AI-CHECK] Mid/Side Energy Ratio:", midSideEnergyRatio);
        console.log("[AI-CHECK] Stereo Width Index:", stereoWidthIndex);
      }
    } catch (err: any) {
      // Infra/runtime issue => do NOT reject user audio.
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      // Keep diagnostics server-side only
      console.error("[AI-CHECK] EBUR128 ERROR message:", err?.message || err);
      console.error("[AI-CHECK] EBUR128 ERROR code:", err?.code);
      console.error(
        "[AI-CHECK] EBUR128 ERROR stderr:\n",
        String(err?.stderr || "").slice(0, 4000)
      );
      console.error(
        "[AI-CHECK] EBUR128 ERROR stdout:\n",
        String(err?.stdout || "").slice(0, 2000)
      );

      return NextResponse.json({ ok: false, error: "ebur128_detect_failed" }, { status: 500 });
    }

    // 3.5.1) Persist private metrics (server-only truth). Must happen before any cleanup/terminal return.
    if (
      !Number.isFinite(truePeakDb) ||
      !Number.isFinite(integratedLufs) ||
      !Number.isFinite(maxSamplePeakDbfs) ||
      !Number.isFinite(clippedSampleCount) ||
      clippedSampleCount < 0 ||
      !Number.isFinite(phaseCorrelation) ||
      !Number.isFinite(midRmsDbfs) ||
      !Number.isFinite(sideRmsDbfs) ||
      !Number.isFinite(midSideEnergyRatio) ||
      !Number.isFinite(stereoWidthIndex) ||
      !Number.isFinite(spectralSubRmsDbfs) ||
      !Number.isFinite(spectralLowRmsDbfs) ||
      !Number.isFinite(spectralLowMidRmsDbfs) ||
      !Number.isFinite(spectralMidRmsDbfs) ||
      !Number.isFinite(spectralHighMidRmsDbfs) ||
      !Number.isFinite(spectralHighRmsDbfs) ||
      !Number.isFinite(spectralAirRmsDbfs)
    ) {
      await resetQueueToPending({ supabase, userId: user.id, queueId });
      return NextResponse.json({ ok: false, error: "private_metrics_invalid" }, { status: 500 });
    }

    {
      const adminClient = admin as any;

      const titleSnapshot = title && title.length > 0 ? title : "untitled";

      // DEBUG: verify truePeakDbEffective vs stored overs
      try {
        const oversArr = Array.isArray(truePeakOverEvents) ? truePeakOverEvents : [];
        const maxOverDbg = oversArr.reduce((acc: number, ev: any) => {
          const v = Number(ev?.peak_db_tp);
          return Number.isFinite(v) ? Math.max(acc, v) : acc;
        }, -Infinity);

        console.log("[AI-CHECK][TP-DEBUG]", {
          queueId,
          truePeakDb,
          oversCount: oversArr.length,
          maxOverDbg: Number.isFinite(maxOverDbg) ? maxOverDbg : null,
          truePeakDbEffective,
        });
      } catch (e) {
        console.log("[AI-CHECK][TP-DEBUG] failed", String((e as any)?.message ?? e));
      }

      const { error: metricsErr } = await adminClient
        .from("track_ai_private_metrics")
        .upsert(
          {
            queue_id: queueId,
            title: titleSnapshot,
            integrated_lufs: integratedLufs,
            true_peak_db_tp: truePeakDbEffective,
            duration_s: durationSec,
            true_peak_overs: Array.isArray(truePeakOvers) ? truePeakOvers : [],
            loudness_range_lu: lraLu,
            max_sample_peak_dbfs: maxSamplePeakDbfs,
            clipped_sample_count: Math.trunc(clippedSampleCount),
            crest_factor_db: crestFactorDb,
            phase_correlation: phaseCorrelation,
            mid_rms_dbfs: midRmsDbfs,
            side_rms_dbfs: sideRmsDbfs,
            mid_side_energy_ratio: midSideEnergyRatio,
            stereo_width_index: stereoWidthIndex,
            spectral_sub_rms_dbfs: spectralSubRmsDbfs,
            spectral_low_rms_dbfs: spectralLowRmsDbfs,
            spectral_lowmid_rms_dbfs: spectralLowMidRmsDbfs,
            spectral_mid_rms_dbfs: spectralMidRmsDbfs,
            spectral_highmid_rms_dbfs: spectralHighMidRmsDbfs,
            spectral_high_rms_dbfs: spectralHighRmsDbfs,
            spectral_air_rms_dbfs: spectralAirRmsDbfs,
            mean_short_rms_dbfs: transient.mean_short_rms_dbfs,
            p95_short_rms_dbfs: transient.p95_short_rms_dbfs,
            mean_short_peak_dbfs: transient.mean_short_peak_dbfs,
            p95_short_peak_dbfs: transient.p95_short_peak_dbfs,
            mean_short_crest_db: transient.mean_short_crest_db,
            p95_short_crest_db: transient.p95_short_crest_db,
            transient_density: transient.transient_density,
            punch_index: transient.punch_index,
            analyzed_at: new Date().toISOString(),
          },
          { onConflict: "queue_id" }
        );

      if (metricsErr) {
        console.error("[AI-CHECK] private metrics upsert failed:", metricsErr);
        await resetQueueToPending({ supabase, userId: user.id, queueId });
        return NextResponse.json({ ok: false, error: "private_metrics_upsert_failed" }, { status: 500 });
      }

      // Persist timecoded events (server-only). No client leak unless feedback unlock exists.
      const { error: eventsErr } = await adminClient
        .from("track_ai_private_events")
        .upsert(
          {
            queue_id: queueId,
            true_peak_overs: Array.isArray(truePeakOvers) ? truePeakOvers : [],
            analyzed_at: new Date().toISOString(),
          },
          { onConflict: "queue_id" }
        );

      if (eventsErr) {
        console.error("[AI-CHECK] private events upsert failed:", eventsErr);
        await resetQueueToPending({ supabase, userId: user.id, queueId });
        return NextResponse.json({ ok: false, error: "private_events_upsert_failed" }, { status: 500 });
      }
    }

    // True Peak hard-fail: any overs above 0.0 dBTP (risk of clipping after encoding)
    if (Number.isFinite(truePeakDbEffective) && truePeakDbEffective > 0.0) {
      return await hardFailRejectTechnical({
        supabase,
        userId: user.id,
        queueId,
        audioPath,
        hasFeedbackUnlockFn: hasFeedbackUnlock,
      });
    }

    // Integrated LUFS reject only on extreme cases
    if (Number.isFinite(integratedLufs)) {
      // Extremely quiet => likely silence/corrupt
      if (integratedLufs < -45) {
        return await hardFailRejectTechnical({
          supabase,
          userId: user.id,
          queueId,
          audioPath,
          hasFeedbackUnlockFn: hasFeedbackUnlock,
        });
      }

      // Integrated LUFS hard-fail only for extreme loudness (> -4.0 LUFS)
      if (Number.isFinite(integratedLufs) && integratedLufs > -4.0) {
        return await hardFailRejectTechnical({
          supabase,
          userId: user.id,
          queueId,
          audioPath,
          hasFeedbackUnlockFn: hasFeedbackUnlock,
        });
      }
    }

    // 4) Hash already ensured earlier (required for unlock flows)
    // audioHash is available here as local variable.

    // 5) Analyze (stub for now) using the same buffer
    const tAnalyze = nowNs();
    const decision = await analyzeAudioStub(wavBuf);
    logStage("analyze_stub", elapsedMs(tAnalyze));

    // Global audio dedupe: identical master audio must not enter the system twice
    if (audioHash) {
      // Queue-level race protection: block duplicates that are already in-flight or already approved in the queue
      const { data: existingQueue, error: queueErr } = await supabase
        .from("tracks_ai_queue")
        .select("id")
        .eq("audio_hash", audioHash)
        .in("status", ["pending", "processing", "approved"])
        .neq("id", queueId)
        .limit(1)
        .maybeSingle();

      if (queueErr) {
        return NextResponse.json(
          { ok: false, error: "queue_duplicate_check_failed" },
          { status: 500 }
        );
      }

      if (existingQueue?.id) {
        // Cleanup WAV (best-effort) to avoid ingest leftovers
        await bestEffortRemoveIngestWav({ supabase, audioPath });

        await markQueueRejected({
          supabase,
          userId: user.id,
          queueId,
          reject_reason: "duplicate_audio",
        });

        const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);

        return NextResponse.json({
          ok: true,
          processed: true,
          decision: "rejected",
          reason: "duplicate_audio",
          feedback_available: unlocked,
          queue_id: queueId,
        });
      }
      const { data: existingTrack, error: existingErr } = await supabase
        .from("tracks")
        .select("id")
        .eq("audio_hash", audioHash)
        .limit(1)
        .maybeSingle();

    if (existingErr) {
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json(
        { ok: false, error: "duplicate_check_failed" },
        { status: 500 }
      );
    }

      if (existingTrack?.id) {
        // Cleanup WAV (best-effort) to avoid ingest leftovers
        await bestEffortRemoveIngestWav({ supabase, audioPath });

        await markQueueRejected({
          supabase,
          userId: user.id,
          queueId,
          reject_reason: "duplicate_audio",
        });

        const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
        return jsonTerminal({
          ok: true,
          processed: true,
          decision: "rejected",
          reason: "duplicate_audio",
          feedback_available: unlocked,
          queue_id: queueId,
        });
      }
    }

    if (decision === "rejected") {
      // Cleanup WAV (best-effort). Rejects must not leave ingest artifacts behind.
      await bestEffortRemoveIngestWav({ supabase, audioPath });

      await markQueueRejected({
        supabase,
        userId: user.id,
        queueId,
        reject_reason: "technical",
      });

      const finalAudioHash = audioHash as string;
      if (AI_DEBUG) console.log("[PAYLOAD DEBUG] sending to writeFeedback:", {
        integratedLufs,
        truePeakDb,
        decision,
        queueId,
        finalAudioHash,
      });
      if (finalAudioHash) {
        await writeFeedbackPayloadIfUnlocked({
          admin,
          userId: user.id,
          queueId,
          audioHash: finalAudioHash,
          decision: "rejected",
          integratedLufs: Number.isFinite(integratedLufs) ? integratedLufs : null,
          truePeakDbTp: Number.isFinite(truePeakDb) ? truePeakDb : null,
          clippedSampleCount: Number.isFinite(clippedSampleCount) ? clippedSampleCount : null,
        });
      }

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return jsonTerminal({
        ok: true,
        processed: true,
        decision: "rejected",
        feedback_available: unlocked,
        queue_id: queueId,
      });
    }

    // APPROVE -> insert track
    if (!title) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return jsonTerminal({
        ok: true,
        processed: true,
        decision: "rejected",
        feedback_available: unlocked,
        queue_id: queueId,
      });
    }

    // Placeholder for transcoding output path (WAV -> MP3 happens in next step)
    const safeTitleOut = (title || "untitled")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const mp3Path = `${user.id}/${safeTitleOut}-${queueId}.mp3`;

    // Transcode WAV (already downloaded as wavBuf) -> MP3 (tracks)

    let mp3Bytes: Uint8Array;
    try {
      const tTrans = nowNs();
      const out = await transcodeWavFileToMp3_320({ inPath: tmpWavPath! });
      logStage("transcode_mp3_320", elapsedMs(tTrans));
      mp3Bytes = out.mp3Bytes;
      tmpMp3Path = out.outPath;
    } catch {
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json({ ok: false, error: "transcode_failed" }, { status: 500 });
    }

    const tUp = nowNs();
    const { error: mp3UpErr } = await supabase.storage
      .from("tracks")
      .upload(mp3Path, new Blob([Buffer.from(mp3Bytes)], { type: "audio/mpeg" }), {
        contentType: "audio/mpeg",
        upsert: false,
      });
    logStage("upload_mp3", elapsedMs(tUp));

    if (mp3UpErr) {
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json({ ok: false, error: "mp3_upload_failed" }, { status: 500 });
    }

    // IMPORTANT: Defer ingest WAV cleanup until we reach a terminal state (approved/rejected).
    // Otherwise retries after later failures (e.g. DB insert) would break.

    const finalAudioHash = audioHash as string | null;

    if (!finalAudioHash) {
      // Should not happen because we hash after analysis, but keep it safe.
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json({ ok: false, error: "missing_audio_hash" }, { status: 500 });
    }

    const tInsert = nowNs();
    const { error: trackError } = await supabase.from("tracks").insert({
      artist_id: user.id,
      audio_path: mp3Path,
      title,
      status: "approved",
      source_queue_id: queueId,
      audio_hash: finalAudioHash,
    });
    logStage("insert_track", elapsedMs(tInsert));

    if (trackError) {
      // Unique violations can mean either:
      // - idempotency (source_queue_id already inserted)
      // - global dedupe (audio_hash already exists)
      if ((trackError as any).code === "23505") {
        const msg = String((trackError as any).message ?? "");
        const isAudioHashUnique =
          msg.includes("tracks_audio_hash_unique") || msg.includes("audio_hash");
        const isQueueUnique =
          msg.includes("tracks_source_queue_id_uq") || msg.includes("source_queue_id");

        // If it's the global audio hash unique constraint => controlled duplicate rejection
        if (isAudioHashUnique && !isQueueUnique) {
          await bestEffortRemoveIngestWav({ supabase, audioPath });

          await markQueueRejected({
            supabase,
            userId: user.id,
            queueId,
            reject_reason: "duplicate_audio",
          });

          const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);

          return NextResponse.json({
            ok: true,
            processed: true,
            decision: "rejected",
            reason: "duplicate_audio",
            feedback_available: unlocked,
            queue_id: queueId,
          });
        }

        // Otherwise treat as idempotency for this queue
        await markQueueApproved({
          supabase,
          userId: user.id,
          queueId,
          audio_path: mp3Path,
        });

        await bestEffortRemoveIngestWav({ supabase, audioPath });

        if (AI_DEBUG) console.log("[PAYLOAD DEBUG] sending to writeFeedback:", {
          integratedLufs,
          truePeakDb,
          decision,
          queueId,
          finalAudioHash,
        });
        if (finalAudioHash) {
          await writeFeedbackPayloadIfUnlocked({
            admin,
            userId: user.id,
            queueId,
            audioHash: finalAudioHash,
            decision: "approved",
            integratedLufs: Number.isFinite(integratedLufs) ? integratedLufs : null,
            truePeakDbTp: Number.isFinite(truePeakDb) ? truePeakDb : null,
            clippedSampleCount: Number.isFinite(clippedSampleCount) ? clippedSampleCount : null,
          });
        }

        const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
        return jsonTerminal({
          ok: true,
          processed: true,
          decision: "approved",
          feedback_available: unlocked,
          queue_id: queueId,
        });
      }

      // Other insert errors are real errors
      await resetQueueToPending({ supabase, userId: user.id, queueId });

      return NextResponse.json(
        { ok: false, error: "track_insert_failed" },
        { status: 500 }
      );
    }

    await markQueueApproved({
      supabase,
      userId: user.id,
      queueId,
      audio_path: mp3Path,
    });

    await bestEffortRemoveIngestWav({ supabase, audioPath });

    if (AI_DEBUG) console.log("[PAYLOAD DEBUG] sending to writeFeedback:", {
      integratedLufs,
      truePeakDb,
      decision,
      queueId,
      finalAudioHash,
    });
    if (finalAudioHash) {
      await writeFeedbackPayloadIfUnlocked({
        admin,
        userId: user.id,
        queueId,
        audioHash: finalAudioHash,
        decision: "approved",
        integratedLufs: Number.isFinite(integratedLufs) ? integratedLufs : null,
        truePeakDbTp: Number.isFinite(truePeakDb) ? truePeakDb : null,
        clippedSampleCount: Number.isFinite(clippedSampleCount) ? clippedSampleCount : null,
      });
    }

    const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
    return jsonTerminal({
      ok: true,
      processed: true,
      decision: "approved",
      feedback_available: unlocked,
      queue_id: queueId,
    });
  } catch {
    // Absoluter Safety-Net: niemals in processing hängen bleiben
    await resetQueueToPending({ supabase, userId: user.id, queueId });

    return NextResponse.json(
      { ok: false, error: "worker_unhandled_error" },
      { status: 500 }
    );
  } finally {
    // PERF: total + compact JSON summary (console only)
    try {
      const totalMs = elapsedMs(tTotal);
      logStage("total", totalMs);
      if (PERF_ON) {
        console.log(`[AI-CHECK] queue=${queueId} timings=${JSON.stringify(timings)}`);
      }
    } catch {}

    // best-effort cleanup temp files
    try {
      if (tmpWavPath) await unlink(tmpWavPath);
    } catch {}
    try {
      if (tmpMp3Path) await unlink(tmpMp3Path);
    } catch {}
  }
}
