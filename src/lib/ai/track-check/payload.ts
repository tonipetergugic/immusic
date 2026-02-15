import { asAdminClient } from "@/lib/ai/track-check/admin";
import { AI_DEBUG } from "@/lib/ai/track-check/debug";
import type { TrackCheckDecision } from "@/lib/ai/track-check/types";
import { buildFeedbackPayloadV2Mvp, type FeedbackPayloadV2 } from "@/lib/ai/feedbackPayloadV2";

export async function writeFeedbackPayloadIfUnlocked(params: {
  admin: any;
  userId: string;
  queueId: string;
  audioHash: string;
  decision: TrackCheckDecision;
  integratedLufs: number | null;
  truePeakDbTp: number | null;
  clippedSampleCount: number | null;
}) {
  const { admin, userId, queueId, audioHash, decision, integratedLufs, truePeakDbTp, clippedSampleCount } = params;

  // Always use queue.audio_hash as source of truth (unlock and payload must bind to queue hash)
  const adminClient = asAdminClient(admin);
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
    return;
  }

  // Source of truth: build payload from persisted private metrics (not from passed-in params)
  const { data: mRow, error: mErr } = await adminClient
    .from("track_ai_private_metrics")
    .select(
      [
        "duration_s",
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
        "hard_fail_reasons",
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

  // Phase 2 (additiv, unlock-gated): load codec simulation metrics (best-effort)
  let codecSimulation: any = null;

  try {
    const { data: cRow, error: cErr } = await adminClient
      .from("track_ai_codec_simulation")
      .select(
        [
          "pre_true_peak_db",
          "aac128_post_true_peak_db",
          "aac128_overs_count",
          "aac128_headroom_delta_db",
          "aac128_distortion_risk",
          "mp3128_post_true_peak_db",
          "mp3128_overs_count",
          "mp3128_headroom_delta_db",
          "mp3128_distortion_risk",
        ].join(",")
      )
      .eq("queue_id", queueId)
      .maybeSingle();

    if (!cErr && cRow) {
      const c = cRow as any;

      const n = (x: any) => {
        if (typeof x === "number" && Number.isFinite(x)) return x;
        if (typeof x === "string") {
          const p = Number(x);
          return Number.isFinite(p) ? p : null;
        }
        return null;
      };

      const i = (x: any) => {
        if (typeof x === "number" && Number.isFinite(x)) return Math.trunc(x);
        if (typeof x === "string") {
          const p = Number(x);
          return Number.isFinite(p) ? Math.trunc(p) : null;
        }
        return null;
      };

      // numbers may come as string from Postgres
      const preTruePeakDb = n(c?.pre_true_peak_db);

      const aacPost = n(c?.aac128_post_true_peak_db);
      const aacOvers = i(c?.aac128_overs_count);
      const aacDelta = n(c?.aac128_headroom_delta_db);
      const aacRisk = typeof c?.aac128_distortion_risk === "string" ? String(c.aac128_distortion_risk) : null;

      const mp3Post = n(c?.mp3128_post_true_peak_db);
      const mp3Overs = i(c?.mp3128_overs_count);
      const mp3Delta = n(c?.mp3128_headroom_delta_db);
      const mp3Risk = typeof c?.mp3128_distortion_risk === "string" ? String(c.mp3128_distortion_risk) : null;

      const hasAny =
        preTruePeakDb !== null ||
        aacPost !== null ||
        aacOvers !== null ||
        aacDelta !== null ||
        mp3Post !== null ||
        mp3Overs !== null ||
        mp3Delta !== null;

      codecSimulation = hasAny
        ? {
            pre_true_peak_db: preTruePeakDb,
            aac128: {
              post_true_peak_db: aacPost,
              overs_count: aacOvers,
              headroom_delta_db: aacDelta,
              distortion_risk:
                aacRisk === "low" || aacRisk === "moderate" || aacRisk === "high" ? aacRisk : null,
            },
            mp3128: {
              post_true_peak_db: mp3Post,
              overs_count: mp3Overs,
              headroom_delta_db: mp3Delta,
              distortion_risk:
                mp3Risk === "low" || mp3Risk === "moderate" || mp3Risk === "high" ? mp3Risk : null,
            },
          }
        : null;
    }
  } catch {
    // best-effort: no throw
    codecSimulation = null;
  }

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

  const hardFailReasonsSoT = Array.isArray(m.hard_fail_reasons)
    ? (m.hard_fail_reasons as any[])
        .map((r) => {
          const id = typeof (r as any)?.id === "string" ? String((r as any).id) : null;
          if (!id) return null;

          // Shape B: multi-metric reasons (e.g. dynamic_collapse)
          const metricsRaw = (r as any)?.metrics;
          const thresholdsRaw = (r as any)?.thresholds;
          const valuesRaw = (r as any)?.values;

          const metrics =
            Array.isArray(metricsRaw) && metricsRaw.every((x: any) => typeof x === "string")
              ? (metricsRaw as string[])
              : null;

          const thresholdsOk =
            thresholdsRaw &&
            typeof thresholdsRaw === "object" &&
            !Array.isArray(thresholdsRaw);

          const valuesOk =
            valuesRaw &&
            typeof valuesRaw === "object" &&
            !Array.isArray(valuesRaw);

          if (metrics && thresholdsOk && valuesOk) {
            return {
              id,
              metrics,
              thresholds: thresholdsRaw as Record<string, number>,
              values: valuesRaw as Record<string, number>,
            };
          }

          // Shape A: single metric reasons
          const metric = typeof (r as any)?.metric === "string" ? String((r as any).metric) : undefined;

          const thresholdRaw = (r as any)?.threshold;
          const threshold = typeof thresholdRaw === "number" && Number.isFinite(thresholdRaw) ? thresholdRaw : undefined;

          const valueRaw = (r as any)?.value;
          const value = typeof valueRaw === "number" && Number.isFinite(valueRaw) ? valueRaw : undefined;

          return { id, metric, threshold, value };
        })
        .filter(Boolean) as any[]
    : [];

  const payload: FeedbackPayloadV2 = buildFeedbackPayloadV2Mvp({
    queueId,
    audioHash: queueAudioHash,
    decision,
    durationS:
      typeof m.duration_s === "number" && Number.isFinite(m.duration_s) ? m.duration_s : null,
    integratedLufs: integratedLufsSoT,
    truePeakDbTp: truePeakDbTpSoT,
    clippedSampleCount: clippedSampleCountSoT,
    truePeakOversEvents,
    hardFailReasons: hardFailReasonsSoT,

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
    codecSimulation,
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
