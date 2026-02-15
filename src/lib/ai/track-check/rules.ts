export type HardFailReason =
  | {
      id: string;
      metric: string;
      threshold: number;
      value: number;
    }
  | {
      id: string;
      metrics: string[];
      thresholds: Record<string, number>;
      values: Record<string, number>;
    };

export function collectHardFailReasonsV2(params: {
  truePeakDbEffective: number;
  integratedLufs: number;
  lraLu: number;
  clippedSampleCount: number;
  crestFactorDb: number;
}): HardFailReason[] {
  const tp = Number.isFinite(params.truePeakDbEffective) ? params.truePeakDbEffective : null;
  const clippedSamples =
    typeof params.clippedSampleCount === "number" ? params.clippedSampleCount : 0;
  const crest = Number.isFinite(params.crestFactorDb) ? params.crestFactorDb : null;

  // IMUSIC AI Gate Policy v1.0
  // Hard-Fail only for objectively broken / audibly damaged audio.
  // - True Peak: hard-fail only if extreme (> +1.0 dBTP). 0..+1.0 is warning/feedback-only (handled elsewhere).
  // - Clipping: hard-fail only if massive (>= 100 clipped samples). Single/rare clipped samples are warning/feedback-only.
  // - LUFS / LRA are never hard-fail (feedback-only), per policy.

  const HARDFAIL_TRUEPEAK_DBTP = 1.0;
  const HARDFAIL_CLIPPED_SAMPLES = 100;
  const HARDFAIL_DYNAMIC_COLLAPSE_CREST_DB = 3.0;
  const HARDFAIL_DYNAMIC_COLLAPSE_LUFS = -4.0;

  const hardFailReasons: HardFailReason[] = [];

  if (tp !== null && tp > HARDFAIL_TRUEPEAK_DBTP) {
    hardFailReasons.push({
      id: "tp_over_1_0",
      metric: "true_peak_db_tp",
      threshold: HARDFAIL_TRUEPEAK_DBTP,
      value: tp,
    });
  }

  if (clippedSamples >= HARDFAIL_CLIPPED_SAMPLES) {
    hardFailReasons.push({
      id: "massive_clipping",
      metric: "clipped_sample_count",
      threshold: HARDFAIL_CLIPPED_SAMPLES,
      value: clippedSamples,
    });
  }

  if (
    crest !== null &&
    Number.isFinite(params.integratedLufs) &&
    crest < HARDFAIL_DYNAMIC_COLLAPSE_CREST_DB &&
    params.integratedLufs > HARDFAIL_DYNAMIC_COLLAPSE_LUFS
  ) {
    hardFailReasons.push({
      id: "dynamic_collapse",
      metrics: ["crest_factor_db", "integrated_lufs"],
      thresholds: {
        crest_factor_db: HARDFAIL_DYNAMIC_COLLAPSE_CREST_DB,
        integrated_lufs: HARDFAIL_DYNAMIC_COLLAPSE_LUFS,
      },
      values: {
        crest_factor_db: crest,
        integrated_lufs: params.integratedLufs,
      },
    });
  }

  return hardFailReasons;
}
