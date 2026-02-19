import { asAdminClient } from "@/lib/ai/track-check/admin";

export type PersistPrivateResult =
  | { ok: true }
  | { ok: false; error: "private_metrics_invalid" }
  | { ok: false; error: "private_metrics_upsert_failed"; details?: any }
  | { ok: false; error: "private_events_upsert_failed"; details?: any };

export async function persistPrivateMetricsAndEvents(params: {
  admin: any;
  queueId: string;
  title: string | null;
  durationSec: number;
  integratedLufs: number;
  truePeakDbEffective: number;
  lraLu: number;
  maxSamplePeakDbfs: number;
  clippedSampleCount: number;
  crestFactorDb: number;
  phaseCorrelation: number;
  midRmsDbfs: number;
  sideRmsDbfs: number;
  midSideEnergyRatio: number;
  stereoWidthIndex: number;
  lowEndPhaseCorrelation20_120?: number | null;
  lowEndMonoEnergyLossPct20_120?: number | null;
  spectralSubRmsDbfs: number;
  spectralLowRmsDbfs: number;
  spectralLowMidRmsDbfs: number;
  spectralMidRmsDbfs: number;
  spectralHighMidRmsDbfs: number;
  spectralHighRmsDbfs: number;
  spectralAirRmsDbfs: number;
  transient: any;
  truePeakOvers: any[];
  truePeakOverEvents: any[];
  truePeakDb: number;
  shortTermLufsTimeline?: Array<{ t: number; lufs: number }>;
}) : Promise<PersistPrivateResult> {
  // 3.5.1) Persist private metrics (server-only truth). Must happen before any cleanup/terminal return.
  if (
    !Number.isFinite(params.truePeakDb) ||
    !Number.isFinite(params.integratedLufs) ||
    !Number.isFinite(params.maxSamplePeakDbfs) ||
    !Number.isFinite(params.clippedSampleCount) ||
    params.clippedSampleCount < 0 ||
    !Number.isFinite(params.phaseCorrelation) ||
    !Number.isFinite(params.midRmsDbfs) ||
    !Number.isFinite(params.sideRmsDbfs) ||
    !Number.isFinite(params.midSideEnergyRatio) ||
    !Number.isFinite(params.stereoWidthIndex) ||
    !Number.isFinite(params.spectralSubRmsDbfs) ||
    !Number.isFinite(params.spectralLowRmsDbfs) ||
    !Number.isFinite(params.spectralLowMidRmsDbfs) ||
    !Number.isFinite(params.spectralMidRmsDbfs) ||
    !Number.isFinite(params.spectralHighMidRmsDbfs) ||
    !Number.isFinite(params.spectralHighRmsDbfs) ||
    !Number.isFinite(params.spectralAirRmsDbfs)
  ) {
    return { ok: false, error: "private_metrics_invalid" };
  }

  {
    const adminClient = asAdminClient(params.admin);

    const titleSnapshot = params.title && params.title.length > 0 ? params.title : "untitled";

    const { error: metricsErr } = await adminClient
      .from("track_ai_private_metrics")
      .upsert(
        {
          queue_id: params.queueId,
          title: titleSnapshot,
          hard_fail_reasons: [],
          integrated_lufs: params.integratedLufs,
          true_peak_db_tp: params.truePeakDbEffective,
          duration_s: params.durationSec,
          true_peak_overs: Array.isArray(params.truePeakOvers) ? params.truePeakOvers : [],
          loudness_range_lu: params.lraLu,
          max_sample_peak_dbfs: params.maxSamplePeakDbfs,
          clipped_sample_count: Math.trunc(params.clippedSampleCount),
          crest_factor_db: params.crestFactorDb,
          phase_correlation: params.phaseCorrelation,
          mid_rms_dbfs: params.midRmsDbfs,
          side_rms_dbfs: params.sideRmsDbfs,
          mid_side_energy_ratio: params.midSideEnergyRatio,
          stereo_width_index: params.stereoWidthIndex,
          low_end_phase_corr_20_120: params.lowEndPhaseCorrelation20_120,
          low_end_mono_loss_pct_20_120: params.lowEndMonoEnergyLossPct20_120,
          spectral_sub_rms_dbfs: params.spectralSubRmsDbfs,
          spectral_low_rms_dbfs: params.spectralLowRmsDbfs,
          spectral_lowmid_rms_dbfs: params.spectralLowMidRmsDbfs,
          spectral_mid_rms_dbfs: params.spectralMidRmsDbfs,
          spectral_highmid_rms_dbfs: params.spectralHighMidRmsDbfs,
          spectral_high_rms_dbfs: params.spectralHighRmsDbfs,
          spectral_air_rms_dbfs: params.spectralAirRmsDbfs,
          mean_short_rms_dbfs: params.transient.mean_short_rms_dbfs,
          p95_short_rms_dbfs: params.transient.p95_short_rms_dbfs,
          mean_short_peak_dbfs: params.transient.mean_short_peak_dbfs,
          p95_short_peak_dbfs: params.transient.p95_short_peak_dbfs,
          mean_short_crest_db: params.transient.mean_short_crest_db,
          p95_short_crest_db: params.transient.p95_short_crest_db,
          transient_density: params.transient.transient_density,
          transient_density_std: params.transient.transient_density_std,
          transient_density_cv: params.transient.transient_density_cv,
          punch_index: params.transient.punch_index,
          short_term_lufs_timeline: Array.isArray(params.shortTermLufsTimeline) ? params.shortTermLufsTimeline : [],
          analyzed_at: new Date().toISOString(),
        },
        { onConflict: "queue_id" }
      );

    if (metricsErr) {
      console.error("[AI-CHECK] private metrics upsert failed:", metricsErr);
      return { ok: false, error: "private_metrics_upsert_failed", details: metricsErr };
    }

    // Persist timecoded events (server-only). No client leak unless feedback unlock exists.
    const { error: eventsErr } = await adminClient
      .from("track_ai_private_events")
      .upsert(
        {
          queue_id: params.queueId,
          true_peak_overs: Array.isArray(params.truePeakOvers) ? params.truePeakOvers : [],
          analyzed_at: new Date().toISOString(),
        },
        { onConflict: "queue_id" }
      );

    if (eventsErr) {
      console.error("[AI-CHECK] private events upsert failed:", eventsErr);
      return { ok: false, error: "private_events_upsert_failed", details: eventsErr };
    }
  }

  return { ok: true };
}
