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
  // IMUSIC AI Gate Policy v1.0
  // Hard-Fail only for objectively broken / clearly audibly damaged audio.
  // - True Peak: hard-fail only if very extreme (> +2.0 dBTP). Values above 0.0 dBTP remain warning/feedback-only unless they cross this hard-fail line.
  // - Clipping: hard-fail only if massive (>= 100 clipped samples). Single/rare clipped samples are warning/feedback-only.
  // - LUFS / LRA / Crest are not hard-fail on their own in Gate v1.0. They remain analysis/feedback signals only.

  const HARDFAIL_TRUEPEAK_DBTP = 2.0;
  const HARDFAIL_CLIPPED_SAMPLES = 100;

  const hardFailReasons: HardFailReason[] = [];

  if (tp !== null && tp > HARDFAIL_TRUEPEAK_DBTP) {
    hardFailReasons.push({
      id: "tp_over_2_0",
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

  return hardFailReasons;
}
