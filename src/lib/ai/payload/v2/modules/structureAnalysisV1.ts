import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";
import { clamp01, clamp100 } from "@/lib/ai/payload/v2/utils";
import { stabilizeStructureSectionsV1 } from "@/lib/ai/payload/v2/modules/structureSectionsStabilizerV1";
import { applyStructureSequenceRulesV1 } from "@/lib/ai/payload/v2/modules/structureSectionsSequenceRulesV1";

type EnergyPointV1 = { t: number; e: number };

type StructureSectionV1 =
  | { type: "intro"; start: number; end: number }
  | { type: "build"; start: number; end: number }
  | { type: "break"; start: number; end: number }
  | { type: "outro"; start: number; end: number }
  | { type: "drop"; t: number; impact: number; impact_score: number };

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function windowIndicesBySeconds(
  t: number[],
  centerIdx: number,
  beforeS: number,
  afterS: number
): { i0: number; i1: number } {
  const t0 = t[centerIdx]! - beforeS;
  const t1 = t[centerIdx]! + afterS;
  let i0 = centerIdx;
  while (i0 > 0 && t[i0 - 1]! >= t0) i0--;
  let i1 = centerIdx;
  while (i1 < t.length - 1 && t[i1 + 1]! <= t1) i1++;
  return { i0, i1 };
}

function movingAverageBySeconds(points: EnergyPointV1[], windowS: number): EnergyPointV1[] {
  if (points.length === 0) return [];
  const t = points.map((p) => p.t);
  const e = points.map((p) => p.e);
  const out: EnergyPointV1[] = [];
  for (let i = 0; i < points.length; i++) {
    const { i0, i1 } = windowIndicesBySeconds(t, i, windowS / 2, windowS / 2);
    const seg = e.slice(i0, i1 + 1);
    out.push({ t: t[i]!, e: clamp01(mean(seg)) });
  }
  return out;
}

export function buildStructureAnalysisV1(input: {
  shortTermLufsTimeline: Array<{ t: number; lufs: number }> | null | undefined;
  transientDensity?: number | null | undefined;
  meanShortCrestDb?: number | null | undefined;
  p95ShortCrestDb?: number | null | undefined;
}): StructureAnalysisV1 | null {
  const timeline = Array.isArray(input.shortTermLufsTimeline) ? input.shortTermLufsTimeline : null;
  if (!timeline || timeline.length < 3) return null;

  const t = timeline.map((p) => p.t);
  const lufs = timeline.map((p) => p.lufs).filter((x) => Number.isFinite(x));

  const lLow = percentile(lufs, 0.10);
  const lHigh = percentile(lufs, 0.90);
  const denom = lHigh - lLow;

  const bC = clamp01(
    ((Number.isFinite(input.meanShortCrestDb as any) ? (input.meanShortCrestDb as number) : 0) - 5) / 10
  );
  const bD = clamp01(Number.isFinite(input.transientDensity as any) ? (input.transientDensity as number) : 0);
  const b = 0.6 * bC + 0.4 * bD;

  const rawEnergy: EnergyPointV1[] = timeline.map((p) => {
    const el = denom > 1e-6 ? clamp01((p.lufs - lLow) / denom) : 0;
    const e = clamp01((0.85 + 0.15 * b) * el);
    return { t: p.t, e };
  });

  const energy_curve = movingAverageBySeconds(rawEnergy, 3);

  // -------------------------
  // Density zones
  let low = 0,
    mid = 0,
    high = 0,
    extreme = 0;
  for (const p of energy_curve) {
    if (p.e < 0.35) low++;
    else if (p.e < 0.65) mid++;
    else if (p.e < 0.85) high++;
    else extreme++;
  }
  const n = energy_curve.length || 1;
  const dist = {
    low: (low / n) * 100,
    mid: (mid / n) * 100,
    high: (high / n) * 100,
    extreme: (extreme / n) * 100,
  };

  const dominant_zone =
    dist.low > 60 ? "low" : dist.mid > 60 ? "mid" : dist.high > 60 ? "high" : dist.extreme > 40 ? "extreme" : null;

  // entropy score (0..100)
  const probs = [dist.low, dist.mid, dist.high, dist.extreme]
    .map((x) => x / 100)
    .filter((x) => x > 0);
  const ent = probs.length === 0 ? 0 : -probs.reduce((acc, p) => acc + p * Math.log(p), 0);
  const entMax = Math.log(4);
  const entropy_score = clamp100((entMax > 0 ? ent / entMax : 0) * 100);

  // -------------------------
  // Peaks + primary peak
  const eArr = energy_curve.map((p) => p.e);
  const peaks: StructureAnalysisV1["peaks"] = [];
  const MIN_PEAK_SEP_S = 2; // collapse near-duplicate peaks (e.g. same drop plateau)

  function localMax(i: number, radiusS: number): boolean {
    const { i0, i1 } = windowIndicesBySeconds(t, i, radiusS, radiusS);
    const v = eArr[i]!;
    for (let k = i0; k <= i1; k++) {
      if (k === i) continue;
      if (eArr[k]! > v) return false;
    }
    return true;
  }

  for (let i = 1; i < energy_curve.length - 1; i++) {
    const v = eArr[i]!;
    if (v < 0.75) continue;
    if (!localMax(i, 3)) continue;

    const pre = windowIndicesBySeconds(t, i, 8, 2);
    const preVals = eArr.slice(pre.i0, Math.max(pre.i0, i - 1));
    const contrast = v - mean(preVals);

    const sustainWin = windowIndicesBySeconds(t, i, 2, 6);
    const sustain = mean(eArr.slice(sustainWin.i0, sustainWin.i1 + 1));

    const contrastN = clamp01(contrast / 0.35);
    const score = clamp01(0.45 * v + 0.4 * contrastN + 0.15 * sustain);

    peaks.push({ t: t[i]!, energy: v, score, contrast, sustain: clamp01(sustain) });
  }

  // Dedupe peaks that are very close in time (keep highest score in each neighborhood)
  peaks.sort((a, b) => a.t - b.t);
  const dedupedPeaks: StructureAnalysisV1["peaks"] = [];
  for (const pk of peaks) {
    const last = dedupedPeaks[dedupedPeaks.length - 1];
    if (!last) {
      dedupedPeaks.push(pk);
      continue;
    }
    if (pk.t - last.t <= MIN_PEAK_SEP_S) {
      // same neighborhood -> keep best score
      if (pk.score > last.score) {
        dedupedPeaks[dedupedPeaks.length - 1] = pk;
      }
      continue;
    }
    dedupedPeaks.push(pk);
  }

  // replace peaks with deduped version
  peaks.length = 0;
  peaks.push(...dedupedPeaks);

  let primary_peak: StructureAnalysisV1["primary_peak"] = null;
  if (peaks.length > 0) {
    const best = [...peaks].sort((a, b) => b.score - a.score)[0]!;
    primary_peak = { ...best, is_drop_peak: false };
  }

  // -------------------------
  // Section detection (intro/build/drop/break/outro)
  const sections: StructureSectionV1[] = [];
  const drops: Array<{
    t: number;
    drop_energy: number;
    build_mean_energy: number;
    impact: number;
    impact_score: number;
  }> = [];

  // Drops from peaks list (already local maxima)
  for (const pk of peaks) {
    const i = t.findIndex((x) => x === pk.t);
    if (i < 0) continue;

    // Build-up: preceding ~6s with positive mean gradient
    const pre6 = windowIndicesBySeconds(t, i, 6, 0);
    const g: number[] = [];
    for (let k = pre6.i0 + 1; k <= i; k++) g.push(eArr[k]! - eArr[k - 1]!);
    const gMean = mean(g);

    if (gMean > 0) {
      sections.push({ type: "build", start: t[pre6.i0]!, end: t[Math.max(pre6.i0, i - 1)]! });
    }

    const buildMean = mean(eArr.slice(pre6.i0, Math.max(pre6.i0, i)));
    const impact = pk.energy - buildMean;
    const impact_score = clamp100(clamp01(impact / 0.25) * 100);

    sections.push({ type: "drop", t: pk.t, impact, impact_score });
    drops.push({
      t: pk.t,
      drop_energy: pk.energy,
      build_mean_energy: buildMean,
      impact: clamp01(impact),
      impact_score,
    });

    if (primary_peak && primary_peak.t === pk.t) {
      primary_peak.is_drop_peak = true;
    }

    // Break detection: following energy falls below 0.45 within ~6s
    const post6 = windowIndicesBySeconds(t, i, 0, 6);
    let breakStartIdx: number | null = null;
    for (let k = i + 1; k <= post6.i1; k++) {
      if (eArr[k]! < 0.45) {
        breakStartIdx = k;
        break;
      }
    }
    if (breakStartIdx != null) {
      // extend break until energy rises again above 0.55 or end of window (~16s)
      const post16 = windowIndicesBySeconds(t, breakStartIdx, 0, 16);
      let endIdx = post16.i1;
      for (let k = breakStartIdx + 1; k <= post16.i1; k++) {
        if (eArr[k]! > 0.55) {
          endIdx = k - 1;
          break;
        }
      }
      sections.push({ type: "break", start: t[breakStartIdx]!, end: t[endIdx]! });
    }
  }

  // Intro: first continuous low-energy zone (<0.4)
  let introEnd = -1;
  for (let i = 0; i < eArr.length; i++) {
    if (eArr[i]! < 0.4) introEnd = i;
    else break;
  }
  if (introEnd >= 1) sections.push({ type: "intro", start: t[0]!, end: t[introEnd]! });

  // Outro: last continuous low-energy zone (<0.4)
  let outroStart = -1;
  for (let i = eArr.length - 1; i >= 0; i--) {
    if (eArr[i]! < 0.4) outroStart = i;
    else break;
  }
  if (outroStart >= 0 && outroStart < eArr.length - 1) {
    sections.push({ type: "outro", start: t[outroStart]!, end: t[t.length - 1]! });
  }

  // -------------------------
  // Tension/Release indices
  function windowDelta(i: number, windowS: number): number | null {
    const startT = t[i]!;
    const endT = startT + windowS;
    let j = i;
    while (j < t.length && t[j]! < endT) j++;
    if (j >= t.length) return null;
    return eArr[j]! - eArr[i]!;
  }

  const tensionVals: number[] = [];
  const releaseVals: number[] = [];

  for (let i = 0; i < t.length; i++) {
    const d8 = windowDelta(i, 8);
    if (d8 != null) tensionVals.push(clamp01(d8 / 0.35));

    const d4 = windowDelta(i, 4);
    if (d4 != null) releaseVals.push(clamp01((-d4) / 0.35));
  }

  const tension_index = clamp100(mean(tensionVals) * 100);
  const release_index = clamp100(mean(releaseVals) * 100);
  const balance = clamp100(100 - Math.abs(tension_index - release_index));

  // Dedupe identical sections (can happen with plateau peaks)
  const secKey = (s: StructureSectionV1) => {
    if (s.type === "drop") return `drop:${s.t.toFixed(3)}`;
    return `${s.type}:${Number(s.start).toFixed(3)}-${Number(s.end).toFixed(3)}`;
  };
  const seen = new Set<string>();
  const dedupedSections: StructureSectionV1[] = [];
  for (const s of sections) {
    const k = secKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    dedupedSections.push(s);
  }
  sections.length = 0;
  sections.push(...dedupedSections);

  const stabilized = stabilizeStructureSectionsV1({
    energy_curve,
    sections,
  });

  const sequenced = applyStructureSequenceRulesV1({
    energy_curve,
    sections: stabilized,
  });

  sections.length = 0;
  sections.push(...(sequenced as any));

  return {
    energy_curve,
    density_zones: {
      distribution: dist,
      dominant_zone,
      entropy_score,
    },
    tension_release: {
      tension_index,
      release_index,
      balance,
      drops,
    },
    primary_peak,
    peaks,
    sections,
  };
}
