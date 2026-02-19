import { clamp01, clamp100 } from "@/lib/ai/payload/v2/utils";
import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";

export type ArrangementDensityLabelV1 =
  | "balanced"
  | "overfilled"
  | "too_sparse"
  | "insufficient_data";

export type ArrangementDensityResultV1 = {
  label: ArrangementDensityLabelV1;
  score_0_100: number; // 0..100, deterministic (higher = stronger imbalance signal)
  confidence_0_100: number; // conservative, 0..100
  highlights: string[];
  features: {
    transient_density_0_1: number | null;
    crest_factor_db: number | null;
    loudness_range_lu: number | null;

    // extended (optional for backward-compat)
    energy_high_share_0_1?: number | null;
    energy_mid_share_0_1?: number | null;
    energy_low_share_0_1?: number | null;

    td_std_0_1?: number | null;
    td_mean_0_1?: number | null;
    td_p25_0_1?: number | null;
    td_p75_0_1?: number | null;
    td_cv?: number | null;

    high_energy_low_transients_pct?: number | null;
    low_energy_high_transients_pct?: number | null;

    stability_class?: "consistent" | "mixed" | "swingy" | null;
  };
  drivers?: {
    overfill_0_1: number | null;
    sparse_0_1: number | null;
    context_mismatch_0_1: number | null;
    stability_0_1: number | null;
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
  transientDensityStd_0_1?: number | null | undefined;
  transientDensityCv?: number | null | undefined;
  crestFactorDb?: number | null | undefined;
  loudnessRangeLu?: number | null | undefined;
  structure?: StructureAnalysisV1 | null | undefined;
}): ArrangementDensityResultV1 {
  const td =
    typeof params.transientDensity_0_1 === "number" && Number.isFinite(params.transientDensity_0_1)
      ? clamp01(params.transientDensity_0_1)
      : null;

  const tdStd =
    typeof params.transientDensityStd_0_1 === "number" && Number.isFinite(params.transientDensityStd_0_1)
      ? clamp01(params.transientDensityStd_0_1)
      : null;

  const tdCv =
    typeof params.transientDensityCv === "number" && Number.isFinite(params.transientDensityCv)
      ? params.transientDensityCv
      : null;

  const crest =
    typeof params.crestFactorDb === "number" && Number.isFinite(params.crestFactorDb)
      ? params.crestFactorDb
      : null;

  const lra =
    typeof params.loudnessRangeLu === "number" && Number.isFinite(params.loudnessRangeLu)
      ? params.loudnessRangeLu
      : null;

  const structure = params.structure ?? null;

  const dist = structure?.density_zones?.distribution ?? null;
  const energyLowShare = dist ? clamp01(dist.low / 100) : null;
  const energyMidShare = dist ? clamp01(dist.mid / 100) : null;
  const energyHighShare = dist ? clamp01((dist.high + dist.extreme) / 100) : null;

  const highlights: string[] = [];

  const stabilityClass =
    typeof tdCv === "number" && Number.isFinite(tdCv)
      ? tdCv < 0.15
        ? "consistent"
        : tdCv < 0.30
          ? "mixed"
          : "swingy"
      : null;

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

        energy_low_share_0_1: energyLowShare,
        energy_mid_share_0_1: energyMidShare,
        energy_high_share_0_1: energyHighShare,

        td_std_0_1: tdStd,
        td_mean_0_1: td,
        td_p25_0_1: null,
        td_p75_0_1: null,
        td_cv: tdCv,

        high_energy_low_transients_pct: null,
        low_energy_high_transients_pct: null,
        stability_class: stabilityClass,
      },
      drivers: {
        overfill_0_1: null,
        sparse_0_1: null,
        context_mismatch_0_1: null,
        stability_0_1: null,
      },
    };
  }

  const LRA_LOW = 4.0;
  const CREST_LOW = 7.0;
  const ENERGY_HIGH_SHARE_REF = 0.35;

  // Overfill risk
  const a1 = td === null ? 0 : clamp01((td - 0.16) / 0.10);
  const a2 = lra === null ? 0 : lra < LRA_LOW ? 1 : clamp01((6.0 - lra) / 2.0);
  const a3 = crest === null ? 0 : crest < CREST_LOW ? 1 : clamp01((8.0 - crest) / 1.0);
  const a4 = energyHighShare === null ? 0 : clamp01((energyHighShare - ENERGY_HIGH_SHARE_REF) / 0.25);
  const overfill01 = clamp01(0.35 * a1 + 0.25 * a2 + 0.25 * a3 + 0.15 * a4);

  // Sparse risk
  const b1 = td === null ? 0 : clamp01((0.10 - td) / 0.06);
  const b2 = energyHighShare === null ? 0 : clamp01((0.25 - energyHighShare) / 0.25);
  const sparse01 = clamp01(0.70 * b1 + 0.30 * b2);

  // not available without timeline data
  const contextMismatch01 = null;
  const stability01 = null;

  let label: ArrangementDensityLabelV1 = "balanced";
  if (sparse01 >= 0.6) label = "too_sparse";
  else if (overfill01 >= 0.6) label = "overfilled";

  const score01 = clamp01(Math.max(overfill01, sparse01));
  const score = clamp100(score01 * 100);

  const dominance = clamp01(Math.abs(overfill01 - sparse01));
  const confidence = clamp100(Math.round(55 + 45 * dominance));

  if (label === "overfilled") {
    if (td !== null) highlights.push(`High transient activity (${td.toFixed(2)}) combined with compact dynamics can feel very dense.`);
    if (lra !== null && lra < LRA_LOW) highlights.push(`Macro-dynamics are limited (LRA ${lra.toFixed(1)} < ${LRA_LOW.toFixed(1)}).`);
    if (crest !== null && crest < CREST_LOW) highlights.push(`Crest factor is low (${crest.toFixed(1)} dB < ${CREST_LOW.toFixed(1)} dB).`);
    if (energyHighShare !== null) highlights.push(`High-energy coverage is ${(energyHighShare * 100).toFixed(0)}% of the track.`);
  } else if (label === "too_sparse") {
    if (td !== null) highlights.push(`Transient activity stays low overall (${td.toFixed(2)}), indicating a very open density profile.`);
    if (energyHighShare !== null) highlights.push(`High-energy coverage is ${(energyHighShare * 100).toFixed(0)}% of the track.`);
  } else {
    highlights.push("No strong density imbalance detected with conservative thresholds.");

    if (td !== null) {
      highlights.push(`Transient activity baseline: ${td.toFixed(2)} (relative measure).`);
    }

    if (energyHighShare !== null) {
      highlights.push(`High-energy coverage: ${(energyHighShare * 100).toFixed(0)}% of the track.`);
    }

    if (lra !== null) {
      highlights.push(`Macro-dynamics (LRA): ${lra.toFixed(1)} LU.`);
    } else if (crest !== null) {
      highlights.push(`Crest factor: ${crest.toFixed(1)} dB.`);
    }
  }

  return {
    label,
    score_0_100: score,
    confidence_0_100: confidence,
    highlights,
    features: {
      transient_density_0_1: td,
      crest_factor_db: crest,
      loudness_range_lu: lra,

      energy_low_share_0_1: energyLowShare,
      energy_mid_share_0_1: energyMidShare,
      energy_high_share_0_1: energyHighShare,

      td_std_0_1: tdStd,
      td_mean_0_1: td,
      td_p25_0_1: null,
      td_p75_0_1: null,
      td_cv: tdCv,

      high_energy_low_transients_pct: null,
      low_energy_high_transients_pct: null,
      stability_class: stabilityClass,
    },
    drivers: {
      overfill_0_1: overfill01,
      sparse_0_1: sparse01,
      context_mismatch_0_1: contextMismatch01,
      stability_0_1: stability01,
    },
  };
}

