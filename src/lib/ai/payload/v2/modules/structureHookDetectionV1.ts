import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";

export type HookPatternTypeV1 = "energy_repeat" | "transient_repeat" | "hybrid" | "insufficient_data";

export type HookOccurrenceV1 = {
  start_t: number;
  end_t: number;
  mean_energy_0_1: number;
  peak_energy_0_1: number;
  transient_density_0_1: number | null;
};

export type HookDetectionResultV1 = {
  detected: boolean;
  confidence_0_100: number;
  pattern_type: HookPatternTypeV1;
  occurrences: HookOccurrenceV1[];
  highlights: string[];
  features: {
    duration_s: number | null;
    candidate_count: number;
    best_group_size: number;
    mean_energy_tol: number;
    peak_energy_tol: number;
    window_len_s: number;
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

function safeNum(x: any): number | null {
  return Number.isFinite(x) ? Number(x) : null;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function windowStats(
  energy: Array<{ t: number; e: number }>,
  start_t: number,
  end_t: number
): { mean_e: number | null; peak_e: number | null } {
  if (!Array.isArray(energy) || energy.length < 3) return { mean_e: null, peak_e: null };
  const vals: number[] = [];
  let peak = -Infinity;

  for (const p of energy) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.e)) continue;
    if (p.t >= start_t && p.t <= end_t) {
      vals.push(p.e);
      if (p.e > peak) peak = p.e;
    }
  }

  if (vals.length === 0) return { mean_e: null, peak_e: null };
  return { mean_e: mean(vals), peak_e: peak };
}

/**
 * Modul 5 (V1): Hook Detection (deterministisch, genre-agnostisch)
 *
 * Definition (V1):
 * Hook = wiederkehrendes Energie-Muster (Fenster) an mindestens 2 Stellen im Track.
 * Keine Harmonie/Melodie, keine Wertung, nur Pattern-Repetition.
 *
 * Inputs:
 * - structure.energy_curve
 * - structure.peaks (als Kandidaten-Anker)
 * - optional transientDensity_0_1 (global, beeinflusst nur pattern_type, nicht detection)
 */
export function detectHookV1(params: {
  structure: StructureAnalysisV1 | null | undefined;
  transientDensity_0_1?: number | null | undefined;
}): HookDetectionResultV1 {
  const structure = params.structure;
  const td = safeNum(params.transientDensity_0_1);

  const empty: HookDetectionResultV1 = {
    detected: false,
    confidence_0_100: 0,
    pattern_type: "insufficient_data",
    occurrences: [],
    highlights: ["Insufficient structure data for hook detection."],
    features: {
      duration_s: null,
      candidate_count: 0,
      best_group_size: 0,
      mean_energy_tol: 0.07,
      peak_energy_tol: 0.10,
      window_len_s: 6,
    },
  };

  if (!structure || !Array.isArray(structure.energy_curve) || structure.energy_curve.length < 12) return empty;

  const energy = structure.energy_curve;
  const t0 = energy[0]!.t;
  const t1 = energy[energy.length - 1]!.t;
  const duration_s = Number.isFinite(t1 - t0) && t1 > t0 ? t1 - t0 : null;

  // Very short clips are not reliable for repetition.
  if (duration_s == null || duration_s < 18) {
    return { ...empty, features: { ...empty.features, duration_s } };
  }

  const peaks = Array.isArray(structure.peaks) ? structure.peaks : [];
  if (peaks.length === 0) {
    return {
      ...empty,
      features: { ...empty.features, duration_s, candidate_count: 0 },
      highlights: ["No peaks available to generate hook candidates."],
    };
  }

  // Candidate windows (fixed length around peaks)
  const WINDOW_LEN_S = 6; // V1 fixed to reduce calibration needs
  const HALF = WINDOW_LEN_S / 2;

  const candidates: Array<HookOccurrenceV1 & { anchor_t: number }> = [];

  for (const p of peaks) {
    if (!Number.isFinite(p.t)) continue;
    const start_t = Math.max(t0, p.t - HALF);
    const end_t = Math.min(t1, p.t + HALF);
    if (end_t - start_t < 3) continue;

    const stats = windowStats(energy, start_t, end_t);
    if (stats.mean_e == null || stats.peak_e == null) continue;

    candidates.push({
      anchor_t: p.t,
      start_t,
      end_t,
      mean_energy_0_1: clamp01(stats.mean_e),
      peak_energy_0_1: clamp01(stats.peak_e),
      transient_density_0_1: td != null ? clamp01(td) : null,
    });
  }

  const MEAN_TOL = 0.07;
  const PEAK_TOL = 0.10;

  // Group by similarity (deterministic, greedy):
  // pick each candidate as a seed, find all similar ones, keep best group.
  let bestGroup: HookOccurrenceV1[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const seed = candidates[i]!;
    const group: HookOccurrenceV1[] = [
      {
        start_t: seed.start_t,
        end_t: seed.end_t,
        mean_energy_0_1: seed.mean_energy_0_1,
        peak_energy_0_1: seed.peak_energy_0_1,
        transient_density_0_1: seed.transient_density_0_1,
      },
    ];

    for (let j = 0; j < candidates.length; j++) {
      if (j === i) continue;
      const c = candidates[j]!;
      const dMean = Math.abs(c.mean_energy_0_1 - seed.mean_energy_0_1);
      const dPeak = Math.abs(c.peak_energy_0_1 - seed.peak_energy_0_1);

      if (dMean <= MEAN_TOL && dPeak <= PEAK_TOL) {
        group.push({
          start_t: c.start_t,
          end_t: c.end_t,
          mean_energy_0_1: c.mean_energy_0_1,
          peak_energy_0_1: c.peak_energy_0_1,
          transient_density_0_1: c.transient_density_0_1,
        });
      }
    }

    // deterministic tie-break: prefer larger group; if equal, prefer earlier occurrence
    if (
      group.length > bestGroup.length ||
      (group.length === bestGroup.length && group.length > 0 && group[0]!.start_t < bestGroup[0]!.start_t)
    ) {
      bestGroup = group;
    }
  }

  // Sort occurrences by time (stable)
  bestGroup.sort((a, b) => a.start_t - b.start_t);

  const detected = bestGroup.length >= 2;

  const highlights: string[] = [];
  if (!detected) {
    highlights.push("No repeated energy window detected (requires ≥2 similar occurrences).");
    return {
      detected: false,
      confidence_0_100: 20,
      pattern_type: "energy_repeat",
      occurrences: [],
      highlights,
      features: {
        duration_s,
        candidate_count: candidates.length,
        best_group_size: bestGroup.length,
        mean_energy_tol: MEAN_TOL,
        peak_energy_tol: PEAK_TOL,
        window_len_s: WINDOW_LEN_S,
      },
    };
  }

  // Confidence (conservative, no calibration knobs):
  // - base on group size and internal similarity to seed.
  const base = 55;
  const sizeBoost = Math.min(25, (bestGroup.length - 2) * 12.5); // 2->0, 3->12.5, 4->25
  // Similarity proxy: average delta to first occurrence
  const seed = bestGroup[0]!;
  const deltas: number[] = [];
  for (const o of bestGroup) {
    deltas.push(Math.abs(o.mean_energy_0_1 - seed.mean_energy_0_1) / MEAN_TOL);
    deltas.push(Math.abs(o.peak_energy_0_1 - seed.peak_energy_0_1) / PEAK_TOL);
  }
  const avgDeltaNorm = deltas.length ? mean(deltas) : 1;
  const simBoost = clamp100((1 - Math.min(1, avgDeltaNorm)) * 20);

  const confidence = clamp100(base + sizeBoost + simBoost);

  highlights.push(`Repeated energy window detected (${bestGroup.length} occurrences).`);
  highlights.push(`Window length: ${WINDOW_LEN_S.toFixed(0)}s. Similarity within tolerances (mean±${MEAN_TOL}, peak±${PEAK_TOL}).`);

  // Pattern type: if TD is high, call it hybrid (still energy-based detection)
  const pattern_type: HookPatternTypeV1 = td != null && td >= 0.65 ? "hybrid" : "energy_repeat";

  return {
    detected: true,
    confidence_0_100: confidence,
    pattern_type,
    occurrences: bestGroup,
    highlights,
    features: {
      duration_s,
      candidate_count: candidates.length,
      best_group_size: bestGroup.length,
      mean_energy_tol: MEAN_TOL,
      peak_energy_tol: PEAK_TOL,
      window_len_s: WINDOW_LEN_S,
    },
  };
}

