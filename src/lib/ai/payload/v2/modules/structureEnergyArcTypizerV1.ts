import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";

export type EnergyArcLabelV1 =
  | "rising_arc"
  | "plateau"
  | "late_drop"
  | "early_peak"
  | "energy_collapse"
  | "chaotic_distribution"
  | "insufficient_data";

export type EnergyArcResultV1 = {
  label: EnergyArcLabelV1;
  confidence_0_100: number; // conservative confidence
  highlights: string[]; // short, deterministic explanations
  features: {
    duration_s: number | null;
    primary_peak_t: number | null;
    primary_peak_pos_0_1: number | null; // peak timing as fraction of track
    start_mean_e: number | null; // first ~20%
    mid_mean_e: number | null; // middle ~20%
    end_mean_e: number | null; // last ~20%
    peak_e: number | null;
    peak_count: number | null;
    entropy_score: number | null; // 0..100
    tension_index: number | null; // 0..100
    release_index: number | null; // 0..100
  };
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function clamp100(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function safeNum(x: any): number | null {
  return Number.isFinite(x) ? Number(x) : null;
}

function windowMean(energy: Array<{ t: number; e: number }>, startPos: number, endPos: number): number | null {
  if (!Array.isArray(energy) || energy.length < 3) return null;
  const t0 = energy[0]!.t;
  const t1 = energy[energy.length - 1]!.t;
  const dur = t1 - t0;
  if (!Number.isFinite(dur) || dur <= 0) return null;

  const a = t0 + clamp01(startPos) * dur;
  const b = t0 + clamp01(endPos) * dur;

  const vals: number[] = [];
  for (const p of energy) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.e)) continue;
    if (p.t >= a && p.t <= b) vals.push(p.e);
  }
  if (vals.length === 0) return null;
  return mean(vals);
}

/**
 * Modul 3 (V1): Energy Arc Typisierung (deterministisch, konservativ).
 *
 * Ziel: Für Artists eine grobe dramaturgische Form benennen, ohne Geschmack/Genre.
 * Input: bestehende StructureAnalysisV1 Outputs.
 * Output: Label + kurze, nachvollziehbare Gründe.
 *
 * IMPORTANT:
 * - Keine Mutationen an structure
 * - Keine UI
 * - Keine ML
 */
export function classifyEnergyArcV1(structure: StructureAnalysisV1 | null | undefined): EnergyArcResultV1 {
  if (!structure || !Array.isArray(structure.energy_curve) || structure.energy_curve.length < 8) {
    return {
      label: "insufficient_data",
      confidence_0_100: 0,
      highlights: ["Insufficient energy_curve data for arc classification."],
      features: {
        duration_s: null,
        primary_peak_t: null,
        primary_peak_pos_0_1: null,
        start_mean_e: null,
        mid_mean_e: null,
        end_mean_e: null,
        peak_e: null,
        peak_count: null,
        entropy_score: null,
        tension_index: null,
        release_index: null,
      },
    };
  }

  const energy = structure.energy_curve;
  const t0 = energy[0]!.t;
  const t1 = energy[energy.length - 1]!.t;
  const duration_s = Number.isFinite(t1 - t0) && t1 > t0 ? t1 - t0 : null;

  const start_mean_e = windowMean(energy, 0.00, 0.20);
  const mid_mean_e = windowMean(energy, 0.40, 0.60);
  const end_mean_e = windowMean(energy, 0.80, 1.00);

  const primary = structure.primary_peak;
  const primary_peak_t = primary ? primary.t : null;
  const primary_peak_pos_0_1 =
    duration_s && primary_peak_t != null ? clamp01((primary_peak_t - t0) / duration_s) : null;

  const peak_e = primary ? primary.energy : null;
  const peak_count = Array.isArray(structure.peaks) ? structure.peaks.length : null;

  const entropy_score = safeNum(structure.density_zones?.entropy_score);
  const tension_index = safeNum(structure.tension_release?.tension_index);
  const release_index = safeNum(structure.tension_release?.release_index);

  const highlights: string[] = [];

  // Derived deltas (null-safe)
  const sE = start_mean_e;
  const mE = mid_mean_e;
  const eE = end_mean_e;

  const startToEndDelta = sE != null && eE != null ? eE - sE : null;
  const peakToEndDrop = peak_e != null && eE != null ? peak_e - eE : null;

  // Heuristics thresholds (conservative)
  const EARLY_PEAK_POS = 0.35;
  const LATE_PEAK_POS = 0.65;

  const RISING_DELTA = 0.15;
  const PLATEAU_RANGE = 0.10;

  const COLLAPSE_DROP = 0.25; // peak much higher than end
  const LOW_END_LEVEL = 0.40;

  const CHAOS_ENTROPY = 85; // highly distributed energy zones
  const CHAOS_PEAKS = 4;

  // 1) Chaotic distribution (most distinctive)
  if ((entropy_score != null && entropy_score >= CHAOS_ENTROPY) || (peak_count != null && peak_count >= CHAOS_PEAKS)) {
    const conf = clamp100(
      (entropy_score != null ? (entropy_score - CHAOS_ENTROPY) * 2 : 0) + (peak_count != null ? (peak_count - 3) * 10 : 0)
    );
    highlights.push(
      entropy_score != null
        ? `High entropy_score (${entropy_score.toFixed(1)}) suggests widely distributed energy zones.`
        : "High peak density suggests frequent energy maxima."
    );
    if (peak_count != null) highlights.push(`Detected peaks: ${peak_count}.`);
    return {
      label: "chaotic_distribution",
      confidence_0_100: clamp100(Math.max(55, conf)),
      highlights,
      features: {
        duration_s,
        primary_peak_t,
        primary_peak_pos_0_1,
        start_mean_e,
        mid_mean_e,
        end_mean_e,
        peak_e,
        peak_count,
        entropy_score,
        tension_index,
        release_index,
      },
    };
  }

  // 2) Plateau (flat-ish energy over the track)
  if (sE != null && mE != null && eE != null) {
    const minE = Math.min(sE, mE, eE);
    const maxE = Math.max(sE, mE, eE);
    if (maxE - minE <= PLATEAU_RANGE) {
      highlights.push(
        `Energy is relatively flat (range ${(maxE - minE).toFixed(2)} ≤ ${PLATEAU_RANGE.toFixed(2)}).`
      );
      return {
        label: "plateau",
        confidence_0_100: 70,
        highlights,
        features: {
          duration_s,
          primary_peak_t,
          primary_peak_pos_0_1,
          start_mean_e,
          mid_mean_e,
          end_mean_e,
          peak_e,
          peak_count,
          entropy_score,
          tension_index,
          release_index,
        },
      };
    }
  }

  // 3) Energy collapse (strong peak, then end is low)
  if (peakToEndDrop != null && eE != null) {
    if (peakToEndDrop >= COLLAPSE_DROP && eE <= LOW_END_LEVEL) {
      highlights.push(
        `Energy drops strongly after peak (peak→end Δ=${peakToEndDrop.toFixed(2)} ≥ ${COLLAPSE_DROP.toFixed(2)}).`
      );
      highlights.push(`End energy is low (end_mean_e=${eE.toFixed(2)} ≤ ${LOW_END_LEVEL.toFixed(2)}).`);
      return {
        label: "energy_collapse",
        confidence_0_100: 75,
        highlights,
        features: {
          duration_s,
          primary_peak_t,
          primary_peak_pos_0_1,
          start_mean_e,
          mid_mean_e,
          end_mean_e,
          peak_e,
          peak_count,
          entropy_score,
          tension_index,
          release_index,
        },
      };
    }
  }

  // 4) Early peak / Late drop (based on primary peak timing)
  if (primary_peak_pos_0_1 != null) {
    if (primary_peak_pos_0_1 <= EARLY_PEAK_POS) {
      highlights.push(`Primary peak occurs early (pos=${primary_peak_pos_0_1.toFixed(2)} ≤ ${EARLY_PEAK_POS}).`);
      return {
        label: "early_peak",
        confidence_0_100: 65,
        highlights,
        features: {
          duration_s,
          primary_peak_t,
          primary_peak_pos_0_1,
          start_mean_e,
          mid_mean_e,
          end_mean_e,
          peak_e,
          peak_count,
          entropy_score,
          tension_index,
          release_index,
        },
      };
    }

    if (primary_peak_pos_0_1 >= LATE_PEAK_POS) {
      highlights.push(`Primary peak occurs late (pos=${primary_peak_pos_0_1.toFixed(2)} ≥ ${LATE_PEAK_POS}).`);
      return {
        label: "late_drop",
        confidence_0_100: 65,
        highlights,
        features: {
          duration_s,
          primary_peak_t,
          primary_peak_pos_0_1,
          start_mean_e,
          mid_mean_e,
          end_mean_e,
          peak_e,
          peak_count,
          entropy_score,
          tension_index,
          release_index,
        },
      };
    }
  }

  // 5) Rising arc (end clearly higher than start)
  if (startToEndDelta != null) {
    if (startToEndDelta >= RISING_DELTA) {
      highlights.push(
        `Energy rises across the track (start→end Δ=${startToEndDelta.toFixed(2)} ≥ ${RISING_DELTA.toFixed(2)}).`
      );
      return {
        label: "rising_arc",
        confidence_0_100: 60,
        highlights,
        features: {
          duration_s,
          primary_peak_t,
          primary_peak_pos_0_1,
          start_mean_e,
          mid_mean_e,
          end_mean_e,
          peak_e,
          peak_count,
          entropy_score,
          tension_index,
          release_index,
        },
      };
    }
  }

  // Fallback: choose the safest label
  highlights.push("No strong arc pattern detected with conservative thresholds.");
  return {
    label: "insufficient_data",
    confidence_0_100: 20,
    highlights,
    features: {
      duration_s,
      primary_peak_t,
      primary_peak_pos_0_1,
      start_mean_e,
      mid_mean_e,
      end_mean_e,
      peak_e,
      peak_count,
      entropy_score,
      tension_index,
      release_index,
    },
  };
}
