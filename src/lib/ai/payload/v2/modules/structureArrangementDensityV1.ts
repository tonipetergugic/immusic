import { clamp01, clamp100 } from "@/lib/ai/payload/v2/utils";

export type ArrangementDensityLabelV1 =
  | "balanced"
  | "overfilled"
  | "too_sparse"
  | "insufficient_data";

export type ArrangementDensityResultV1 = {
  label: ArrangementDensityLabelV1;
  score_0_100: number; // 0..100, deterministic
  confidence_0_100: number; // conservative
  highlights: string[];
  features: {
    transient_density_0_1: number | null;
    crest_factor_db: number | null;
    loudness_range_lu: number | null;
  };
};

/**
 * Modul 7 (V1): Arrangement Density Intelligence
 *
 * Goal:
 * - Provide a conservative, non-judgmental density signal for artists.
 * - "Overfilled" = too much transient density + limited dynamics.
 * - "Too sparse" = unusually low transient density (potentially empty/flat).
 *
 * NOTE:
 * - Deterministic heuristics only (no ML).
 * - Thresholds are intentionally conservative; calibration later.
 */
export function analyzeArrangementDensityV1(params: {
  transientDensity_0_1?: number | null | undefined; // expected 0..1
  crestFactorDb?: number | null | undefined;
  loudnessRangeLu?: number | null | undefined;
}): ArrangementDensityResultV1 {
  const td =
    typeof params.transientDensity_0_1 === "number" && Number.isFinite(params.transientDensity_0_1)
      ? clamp01(params.transientDensity_0_1)
      : null;

  const crest =
    typeof params.crestFactorDb === "number" && Number.isFinite(params.crestFactorDb)
      ? params.crestFactorDb
      : null;

  const lra =
    typeof params.loudnessRangeLu === "number" && Number.isFinite(params.loudnessRangeLu)
      ? params.loudnessRangeLu
      : null;

  const highlights: string[] = [];

  if (td === null && crest === null && lra === null) {
    return {
      label: "insufficient_data",
      score_0_100: 0,
      confidence_0_100: 0,
      highlights: ["Insufficient transient/dynamics data for density analysis."],
      features: {
        transient_density_0_1: td,
        crest_factor_db: crest,
        loudness_range_lu: lra,
      },
    };
  }

  // Conservative bands (calibrate later)
  const TD_TOO_SPARSE = 0.08;
  const TD_HIGH = 0.30;

  const LRA_LOW = 3.0; // very low macro-dynamics
  const CREST_LOW = 8.0; // tends to indicate heavy limiting

  // Score components (0..1)
  // overfill signal grows when td is high AND (lra/crest are low)
  const tdOver = td === null ? 0 : clamp01((td - TD_HIGH) / 0.20); // 0 above ~0.30..0.50
  const lraLimited = lra === null ? 0 : clamp01((LRA_LOW - lra) / LRA_LOW); // 1 if lra ~0
  const crestLimited = crest === null ? 0 : clamp01((CREST_LOW - crest) / CREST_LOW); // 1 if crest ~0

  const overfill01 = clamp01(0.55 * tdOver + 0.25 * lraLimited + 0.20 * crestLimited);

  // sparse signal mostly driven by low td (avoid false positives)
  const tdSparse = td === null ? 0 : clamp01((TD_TOO_SPARSE - td) / TD_TOO_SPARSE);
  const sparse01 = clamp01(tdSparse);

  // Decide label (conservative)
  let label: ArrangementDensityLabelV1 = "balanced";
  let confidence = 55;

  if (td !== null && td <= TD_TOO_SPARSE) {
    label = "too_sparse";
    confidence = 65;
    highlights.push(`Transient density is very low (${td.toFixed(2)} ≤ ${TD_TOO_SPARSE.toFixed(2)}).`);
  } else if (overfill01 >= 0.55) {
    label = "overfilled";
    confidence = 65;
    if (td !== null) highlights.push(`Transient density is high (${td.toFixed(2)}).`);
    if (lra !== null && lra <= LRA_LOW) highlights.push(`Loudness range is low (LRA ${lra.toFixed(1)} ≤ ${LRA_LOW.toFixed(1)}).`);
    if (crest !== null && crest <= CREST_LOW) highlights.push(`Crest factor is low (${crest.toFixed(1)} dB ≤ ${CREST_LOW.toFixed(1)} dB).`);
  } else {
    label = "balanced";
    confidence = 60;
    highlights.push("No strong density imbalance detected with conservative thresholds.");
  }

  // score_0_100: "risk-like" density imbalance score (higher = more potential issue)
  // For balanced, it will stay low-ish.
  const score01 = clamp01(Math.max(overfill01, sparse01));
  const score = clamp100(score01 * 100);

  return {
    label,
    score_0_100: score,
    confidence_0_100: confidence,
    highlights,
    features: {
      transient_density_0_1: td,
      crest_factor_db: crest,
      loudness_range_lu: lra,
    },
  };
}

