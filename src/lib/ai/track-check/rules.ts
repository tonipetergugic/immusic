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
}): HardFailReason[] {
  const tp = Number.isFinite(params.truePeakDbEffective) ? params.truePeakDbEffective : null;
  const lufs = Number.isFinite(params.integratedLufs) ? params.integratedLufs : null;
  const lra = Number.isFinite(params.lraLu) ? params.lraLu : null;
  const clippedSamples =
    typeof params.clippedSampleCount === "number" ? params.clippedSampleCount : 0;

  // Collect all hard-fail reasons (v2). Reject if at least one reason matches.
  const hardFailReasons: HardFailReason[] = [];

  if (tp !== null && tp > 0.1) {
    hardFailReasons.push({
      id: "tp_over_0_1",
      metric: "true_peak_db_tp",
      threshold: 0.1,
      value: tp,
    });
  }

  if (clippedSamples > 0) {
    hardFailReasons.push({
      id: "clipped_samples",
      metric: "clipped_sample_count",
      threshold: 0,
      value: clippedSamples,
    });
  }

  if (lufs !== null && lufs > -4.5) {
    hardFailReasons.push({
      id: "lufs_too_hot",
      metric: "integrated_lufs",
      threshold: -4.5,
      value: lufs,
    });
  }

  if (lufs !== null && lra !== null && lufs > -6 && lra < 1.0) {
    hardFailReasons.push({
      id: "lufs_plus_low_lra",
      metrics: ["integrated_lufs", "loudness_range_lu"],
      thresholds: { integrated_lufs: -6, loudness_range_lu: 1.0 },
      values: { integrated_lufs: lufs, loudness_range_lu: lra },
    });
  }

  return hardFailReasons;
}
