import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";

export type DropConfidenceLabelV1 = "weak_drop" | "solid_drop" | "high_impact_drop" | "insufficient_data";

export type DropConfidenceItemV1 = {
  t: number; // drop time
  label: DropConfidenceLabelV1;
  confidence_0_100: number;
  features: {
    peak_score_0_1: number | null;
    impact_score_0_100: number | null;
    sustain_0_1: number | null;
    contrast_raw: number | null;
    drop_energy_0_1: number | null;
    build_mean_energy_0_1: number | null;
    transient_density_0_1: number | null; // optional, if provided
  };
  highlights: string[];
};

export type DropConfidenceResultV1 = {
  items: DropConfidenceItemV1[];
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

/**
 * Modul 4 (V1): Drop Confidence System (deterministisch, konservativ)
 *
 * Inputs:
 * - structure.peaks (peak.score, sustain, contrast, energy)
 * - structure.tension_release.drops (impact_score, drop_energy, build_mean_energy)
 * - optional transientDensity (0..1)
 *
 * Output:
 * - pro Drop-Zeitpunkt ein Label + confidence + kurze Gründe
 *
 * IMPORTANT:
 * - Keine Mutationen an structure
 * - Kein Genre/Style/"Geschmack"
 */
export function scoreDropConfidenceV1(params: {
  structure: StructureAnalysisV1 | null | undefined;
  transientDensity_0_1?: number | null | undefined;
}): DropConfidenceResultV1 {
  const structure = params.structure;
  const td = safeNum(params.transientDensity_0_1);

  if (!structure) return { items: [] };

  const drops = Array.isArray(structure.tension_release?.drops) ? structure.tension_release.drops : [];
  const peaks = Array.isArray(structure.peaks) ? structure.peaks : [];

  if (drops.length === 0) return { items: [] };

  // Map peak by time (exact match); fallback nearest within tolerance.
  const PEAK_MATCH_TOL_S = 0.35;

  function findPeakForDrop(t: number) {
    let exact = peaks.find((p) => Number.isFinite(p.t) && p.t === t);
    if (exact) return exact;

    let best: (typeof peaks)[number] | null = null;
    let bestDist = Infinity;
    for (const p of peaks) {
      if (!Number.isFinite(p.t)) continue;
      const d = Math.abs(p.t - t);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (best && bestDist <= PEAK_MATCH_TOL_S) return best;
    return null;
  }

  const items: DropConfidenceItemV1[] = [];

  for (const d of drops) {
    const t = d.t;
    const peak = findPeakForDrop(t);

    const peakScore = peak ? safeNum(peak.score) : null; // 0..1
    const sustain = peak ? safeNum(peak.sustain) : null; // 0..1
    const contrastRaw = peak ? safeNum(peak.contrast) : null; // raw
    const dropEnergy = safeNum(d.drop_energy); // 0..1
    const buildMean = safeNum(d.build_mean_energy); // 0..1
    const impactScore = safeNum(d.impact_score); // 0..100

    // Normalize conservative components (0..1)
    const c_peak = peakScore != null ? clamp01(peakScore) : 0;
    const c_impact = impactScore != null ? clamp01(impactScore / 100) : 0;
    const c_sustain = sustain != null ? clamp01(sustain) : 0;

    // contrast normalization: raw contrast ~0.00..0.35 typical in our engine
    const c_contrast = contrastRaw != null ? clamp01(contrastRaw / 0.35) : 0;

    // transient density helps but must not dominate (optional)
    const c_td = td != null ? clamp01(td) : 0;

    // Weighted score (0..1) (deterministic)
    // impact is the core, then peak score + contrast, sustain last, transient density tiny.
    const score01 =
      0.42 * c_impact +
      0.22 * c_peak +
      0.18 * c_contrast +
      0.14 * c_sustain +
      0.04 * c_td;

    const confidence = clamp100(score01 * 100);

    // Labels (conservative thresholds)
    let label: DropConfidenceLabelV1 = "insufficient_data";
    if (impactScore == null && peakScore == null) {
      label = "insufficient_data";
    } else if (confidence >= 75 && (impactScore ?? 0) >= 70) {
      label = "high_impact_drop";
    } else if (confidence >= 45 && (impactScore ?? 0) >= 35) {
      label = "solid_drop";
    } else {
      label = "weak_drop";
    }

    const highlights: string[] = [];
    if (impactScore != null) highlights.push(`Impact score: ${impactScore.toFixed(1)} / 100.`);
    if (peakScore != null) highlights.push(`Peak score: ${peakScore.toFixed(2)} (0..1).`);
    if (contrastRaw != null) highlights.push(`Contrast (raw): ${contrastRaw.toFixed(2)}.`);
    if (sustain != null) highlights.push(`Sustain: ${sustain.toFixed(2)} (0..1).`);
    if (td != null) highlights.push(`Transient density: ${td.toFixed(2)} (0..1).`);

    items.push({
      t,
      label,
      confidence_0_100: confidence,
      features: {
        peak_score_0_1: peakScore,
        impact_score_0_100: impactScore,
        sustain_0_1: sustain,
        contrast_raw: contrastRaw,
        drop_energy_0_1: dropEnergy,
        build_mean_energy_0_1: buildMean,
        transient_density_0_1: td,
      },
      highlights,
    });
  }

  // stable ordering
  items.sort((a, b) => a.t - b.t);

  return { items };
}
