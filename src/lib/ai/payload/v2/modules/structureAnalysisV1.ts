import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";
import { clamp01, clamp100 } from "@/lib/ai/payload/v2/utils";
import { stabilizeStructureSectionsV1 } from "@/lib/ai/payload/v2/modules/structureSectionsStabilizerV1";
import { applyStructureSequenceRulesV1 } from "@/lib/ai/payload/v2/modules/structureSectionsSequenceRulesV1";
import { computeStructuralBalanceIndexV1 } from "@/lib/ai/payload/v2/modules/structureBalanceIndexV1";

type EnergyPointV1 = { t: number; e: number };

type StructureSectionV1 =
  | { type: "intro"; start: number; end: number }
  | { type: "build"; start: number; end: number }
  | { type: "break"; start: number; end: number }
  | { type: "outro"; start: number; end: number }
  | { type: "drop"; t: number; impact: number; impact_score: number };

type RangeSectionTypeV1 = "intro" | "build" | "break" | "outro";

type RangeSectionV1 = {
  type: RangeSectionTypeV1;
  start: number;
  end: number;
};

type SectionSimilarityVectorV1 = {
  duration_s: number;
  mean_energy: number;
  max_energy: number;
  energy_variance: number;
  start_energy: number;
  end_energy: number;
  energy_delta: number;
  local_peak_density: number;
};

function isRangeSectionV1(section: StructureSectionV1): section is RangeSectionV1 {
  return (
    section.type === "intro" ||
    section.type === "build" ||
    section.type === "break" ||
    section.type === "outro"
  );
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let s = 0;
  for (const v of values) {
    const d = v - m;
    s += d * d;
  }
  return s / values.length;
}

function sliceEnergyPointsByRange(points: EnergyPointV1[], start: number, end: number): EnergyPointV1[] {
  const sliced = points.filter((p) => p.t >= start && p.t <= end);
  if (sliced.length > 0) return sliced;

  let nearestStart: EnergyPointV1 | null = null;
  let nearestEnd: EnergyPointV1 | null = null;

  for (const p of points) {
    if (p.t <= start) nearestStart = p;
    if (p.t >= end) {
      nearestEnd = p;
      break;
    }
  }

  if (nearestStart && nearestEnd) {
    if (nearestStart.t === nearestEnd.t) return [nearestStart];
    return [nearestStart, nearestEnd];
  }

  if (nearestStart) return [nearestStart];
  if (nearestEnd) return [nearestEnd];
  return [];
}

function buildSectionSimilarityVectorV1(args: {
  section: RangeSectionV1;
  energyCurve: EnergyPointV1[];
  peaks: NonNullable<StructureAnalysisV1["peaks"]>;
}): SectionSimilarityVectorV1 | null {
  const { section, energyCurve, peaks } = args;
  const sectionPoints = sliceEnergyPointsByRange(energyCurve, section.start, section.end);
  if (sectionPoints.length === 0) return null;

  const energies = sectionPoints.map((p) => p.e);
  const duration_s = Math.max(0, section.end - section.start);
  const mean_energy = clamp01(mean(energies));
  const max_energy = clamp01(Math.max(...energies));
  const energy_variance = clamp01(variance(energies));
  const start_energy = clamp01(sectionPoints[0]!.e);
  const end_energy = clamp01(sectionPoints[sectionPoints.length - 1]!.e);
  const energy_delta = end_energy - start_energy;

  let localPeakCount = 0;
  for (const peak of peaks) {
    if (peak.t >= section.start && peak.t <= section.end) localPeakCount++;
  }

  const local_peak_density = duration_s > 1e-6 ? localPeakCount / duration_s : 0;

  return {
    duration_s,
    mean_energy,
    max_energy,
    energy_variance,
    start_energy,
    end_energy,
    energy_delta,
    local_peak_density,
  };
}

function relativeSimilarity(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-6);
  return clamp01(1 - Math.abs(a - b) / denom);
}

function boundedSimilarity(a: number, b: number, maxDiff: number): number {
  if (maxDiff <= 0) return 0;
  return clamp01(1 - Math.abs(a - b) / maxDiff);
}

function computeSectionSimilarityScoreV1(a: SectionSimilarityVectorV1, b: SectionSimilarityVectorV1): number {
  const sims = [
    relativeSimilarity(a.duration_s, b.duration_s),
    boundedSimilarity(a.mean_energy, b.mean_energy, 1),
    boundedSimilarity(a.max_energy, b.max_energy, 1),
    boundedSimilarity(a.energy_variance, b.energy_variance, 1),
    boundedSimilarity(a.start_energy, b.start_energy, 1),
    boundedSimilarity(a.end_energy, b.end_energy, 1),
    boundedSimilarity(a.energy_delta, b.energy_delta, 2),
    relativeSimilarity(a.local_peak_density, b.local_peak_density),
  ];

  return clamp01(mean(sims));
}

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

function countRangeSections(sections: any[]): number {
  if (!Array.isArray(sections)) return 0;
  let n = 0;
  for (const s of sections) {
    if (!s || typeof s !== "object") continue;
    if ("start" in s && "end" in s) n++;
  }
  return n;
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
  mainGenre?: string | null | undefined;
  subgenre?: string | null | undefined;
  referenceArtist?: string | null | undefined;
  referenceTrack?: string | null | undefined;
}): StructureAnalysisV1 | null {
  const timeline = Array.isArray(input.shortTermLufsTimeline) ? input.shortTermLufsTimeline : null;
  if (!timeline || timeline.length < 3) return null;

  const declaredMainGenre =
    typeof input.mainGenre === "string" && input.mainGenre.trim().length > 0
      ? input.mainGenre.trim()
      : null;

  const declaredSubgenre =
    typeof input.subgenre === "string" && input.subgenre.trim().length > 0
      ? input.subgenre.trim()
      : null;

  const declaredReferenceArtist =
    typeof input.referenceArtist === "string" && input.referenceArtist.trim().length > 0
      ? input.referenceArtist.trim()
      : null;

  const declaredReferenceTrack =
    typeof input.referenceTrack === "string" && input.referenceTrack.trim().length > 0
      ? input.referenceTrack.trim()
      : null;

  const mainGenreKey =
    declaredMainGenre !== null && declaredMainGenre.trim().length > 0
      ? declaredMainGenre.trim().toLowerCase()
      : null;

  const subgenreKey =
    declaredSubgenre !== null && declaredSubgenre.trim().length > 0
      ? declaredSubgenre.trim().toLowerCase()
      : null;

  const genre_rule_context: StructureAnalysisV1["genre_rule_context"] = {
    main_genre_key: mainGenreKey,
    subgenre_key: subgenreKey,
    has_reference_artist: declaredReferenceArtist !== null,
    has_reference_track: declaredReferenceTrack !== null,
    genre_rules_ready: mainGenreKey !== null,
  };

  const classifyGenreRuleProfileKey = (genreKey: string | null): NonNullable<
    StructureAnalysisV1["genre_rule_profile"]
  >["profile_key"] => {
    if (genreKey === null) return "unknown";

    if (
      genreKey === "trance" ||
      genreKey === "progressive trance" ||
      genreKey === "uplifting trance" ||
      genreKey === "psytrance" ||
      genreKey === "vocal trance" ||
      genreKey === "hard trance" ||
      genreKey === "tech trance"
    ) {
      return "trance_like";
    }

    if (
      genreKey === "techno" ||
      genreKey === "melodic techno" ||
      genreKey === "peak time techno" ||
      genreKey === "industrial techno" ||
      genreKey === "hard techno"
    ) {
      return "techno_like";
    }

    if (
      genreKey === "house" ||
      genreKey === "deep house" ||
      genreKey === "progressive house" ||
      genreKey === "tech house" ||
      genreKey === "afro house" ||
      genreKey === "future house" ||
      genreKey === "edm" ||
      genreKey === "big room" ||
      genreKey === "electro house" ||
      genreKey === "festival edm"
    ) {
      return "house_edm_like";
    }

    if (
      genreKey === "drum & bass" ||
      genreKey === "liquid drum & bass" ||
      genreKey === "neurofunk" ||
      genreKey === "dubstep" ||
      genreKey === "melodic dubstep" ||
      genreKey === "future bass"
    ) {
      return "bass_music_like";
    }

    if (
      genreKey === "hardstyle" ||
      genreKey === "rawstyle" ||
      genreKey === "hardcore" ||
      genreKey === "uptempo hardcore"
    ) {
      return "hard_dance_like";
    }

    if (
      genreKey === "pop" ||
      genreKey === "dance pop" ||
      genreKey === "indie pop" ||
      genreKey === "hip-hop" ||
      genreKey === "trap" ||
      genreKey === "drill" ||
      genreKey === "r&b" ||
      genreKey === "soul"
    ) {
      return "pop_urban_like";
    }

    if (
      genreKey === "rock" ||
      genreKey === "alternative rock" ||
      genreKey === "indie rock" ||
      genreKey === "metal"
    ) {
      return "rock_metal_like";
    }

    if (
      genreKey === "ambient" ||
      genreKey === "cinematic" ||
      genreKey === "lofi" ||
      genreKey === "other"
    ) {
      return "other_like";
    }

    return "unknown";
  };

  const genreRuleProfileKey =
    classifyGenreRuleProfileKey(subgenreKey) !== "unknown"
      ? classifyGenreRuleProfileKey(subgenreKey)
      : classifyGenreRuleProfileKey(mainGenreKey);

  const genre_rule_profile: StructureAnalysisV1["genre_rule_profile"] = {
    profile_key: genreRuleProfileKey,
    derived_from_main_genre: mainGenreKey,
    derived_from_subgenre: subgenreKey,
  };

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
  // IMPORTANT: Process peaks in time order and apply a drop-block guard to avoid "drop spam".
  const peaksByTime = [...peaks].sort((a, b) => a.t - b.t);

  // Drop-block guard: after accepting a drop, suppress further drop peaks until energy exits the drop state.
  // Genre-agnostic: based only on normalized energy.
  const DROP_EXIT_E = 0.50;     // exit drop when energy falls below this
  const DROP_GUARD_MAX_S = 90;  // max lookahead to find exit (safety cap)
  let dropGuardUntilT: number | null = null;

  for (const pk of peaksByTime) {
    const i = t.findIndex((x) => x === pk.t);
    if (i < 0) continue;

    // If we're still inside an active drop block, ignore additional drop peaks.
    if (dropGuardUntilT != null && pk.t <= dropGuardUntilT) {
      continue;
    }

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

    // Enter drop block: keep suppressing subsequent drop peaks until energy exits the drop state.
    // Find first point within the next DROP_GUARD_MAX_S where energy falls below DROP_EXIT_E.
    const post = windowIndicesBySeconds(t, i, 0, DROP_GUARD_MAX_S);
    let exitT: number | null = null;
    for (let k = i + 1; k <= post.i1; k++) {
      if (eArr[k]! < DROP_EXIT_E) {
        exitT = t[k]!;
        break;
      }
    }
    dropGuardUntilT = exitT;

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

  const ranges_before = countRangeSections(sections);

  const stabilized = stabilizeStructureSectionsV1({
    energy_curve,
    sections,
  });

  const ranges_after_stabilize = countRangeSections(stabilized as any);

  const sequenced = applyStructureSequenceRulesV1({
    energy_curve,
    sections: stabilized,
  });

  const ranges_after_sequence = countRangeSections(sequenced as any);
  const merges_estimated = Math.max(0, ranges_before - ranges_after_sequence);

  sections.length = 0;
  sections.push(...(sequenced as any));

  const rangeSectionEntries = sections
    .map((section, sectionIndex) => {
      if (!isRangeSectionV1(section)) return null;

      const vector = buildSectionSimilarityVectorV1({
        section,
        energyCurve: energy_curve,
        peaks,
      });

      if (!vector) return null;

      return { section, sectionIndex, vector };
    })
    .filter(
      (
        entry
      ): entry is {
        section: RangeSectionV1;
        sectionIndex: number;
        vector: SectionSimilarityVectorV1;
      } => entry !== null
    );

  const similarityPairs: NonNullable<NonNullable<StructureAnalysisV1["section_similarity"]>["pairs"]> = [];

  for (let i = 0; i < rangeSectionEntries.length - 1; i++) {
    for (let j = i + 1; j < rangeSectionEntries.length; j++) {
      const a = rangeSectionEntries[i]!;
      const b = rangeSectionEntries[j]!;
      const similarity_0_1 = computeSectionSimilarityScoreV1(a.vector, b.vector);

      similarityPairs.push({
        from: a.section.type,
        from_index: a.sectionIndex,
        to: b.section.type,
        to_index: b.sectionIndex,
        similarity_0_1,
        features: {
          duration_s: { a: a.vector.duration_s, b: b.vector.duration_s },
          mean_energy: { a: a.vector.mean_energy, b: b.vector.mean_energy },
          max_energy: { a: a.vector.max_energy, b: b.vector.max_energy },
          energy_variance: { a: a.vector.energy_variance, b: b.vector.energy_variance },
          start_energy: { a: a.vector.start_energy, b: b.vector.start_energy },
          end_energy: { a: a.vector.end_energy, b: b.vector.end_energy },
          energy_delta: { a: a.vector.energy_delta, b: b.vector.energy_delta },
          local_peak_density: { a: a.vector.local_peak_density, b: b.vector.local_peak_density },
        },
      });
    }
  }

  const section_similarity: StructureAnalysisV1["section_similarity"] = {
    pairs: similarityPairs,
    highest_similarity_0_1:
      similarityPairs.length > 0
        ? Math.max(...similarityPairs.map((pair) => pair.similarity_0_1))
        : null,
    mean_similarity_0_1:
      similarityPairs.length > 0
        ? mean(similarityPairs.map((pair) => pair.similarity_0_1))
        : null,
  };

  const repetitionPairs = similarityPairs.filter(
    (pair) =>
      pair.from !== "intro" &&
      pair.from !== "outro" &&
      pair.to !== "intro" &&
      pair.to !== "outro"
  );

  const repetitionActivatedScores = repetitionPairs.map((pair) =>
    clamp01((pair.similarity_0_1 - 0.7) / 0.3)
  );

  const repetition_ratio_0_1: StructureAnalysisV1["repetition_ratio_0_1"] =
    repetitionActivatedScores.length > 0
      ? mean(repetitionActivatedScores)
      : null;

  const unique_section_count: StructureAnalysisV1["unique_section_count"] =
    countRangeSections(sections as any);

  const transitionPairStrengths = [];

  for (let i = 0; i < rangeSectionEntries.length - 1; i++) {
    const current = rangeSectionEntries[i]!;
    const next = rangeSectionEntries[i + 1]!;

    const gap_s = Math.max(0, next.section.start - current.section.end);
    const energy_jump = Math.abs(next.vector.start_energy - current.vector.end_energy);

    const gap_score = clamp01(1 - gap_s / 8);
    const energy_score = clamp01(energy_jump / 0.35);
    const transition_pair_strength_0_1 = clamp01(0.65 * energy_score + 0.35 * gap_score);

    transitionPairStrengths.push(transition_pair_strength_0_1);
  }

  const transition_strength_0_1: StructureAnalysisV1["transition_strength_0_1"] =
    transitionPairStrengths.length > 0
      ? mean(transitionPairStrengths)
      : null;

  const noveltyPairScores = [];

  for (let i = 0; i < rangeSectionEntries.length - 1; i++) {
    const current = rangeSectionEntries[i]!;
    const next = rangeSectionEntries[i + 1]!;
    const adjacent_similarity_0_1 = computeSectionSimilarityScoreV1(current.vector, next.vector);
    const type_change_flag = current.section.type === next.section.type ? 0 : 1;
    const novelty_pair_score_0_1 = clamp01(
      0.85 * (1 - adjacent_similarity_0_1) + 0.15 * type_change_flag
    );

    noveltyPairScores.push(novelty_pair_score_0_1);
  }

  const novelty_change_strength_0_1: StructureAnalysisV1["novelty_change_strength_0_1"] =
    noveltyPairScores.length > 0
      ? mean(noveltyPairScores)
      : null;

  const dropSimilarityPairs: NonNullable<
    NonNullable<StructureAnalysisV1["drop_to_drop_similarity"]>["pairs"]
  > = [];

  for (let i = 0; i < drops.length - 1; i++) {
    for (let j = i + 1; j < drops.length; j++) {
      const a = drops[i]!;
      const b = drops[j]!;

      const similarity_0_1 = mean([
        boundedSimilarity(a.drop_energy, b.drop_energy, 1),
        boundedSimilarity(a.build_mean_energy, b.build_mean_energy, 1),
        boundedSimilarity(a.impact, b.impact, 1),
        boundedSimilarity(a.impact_score, b.impact_score, 100),
      ]);

      dropSimilarityPairs.push({
        from_index: i,
        to_index: j,
        similarity_0_1,
        features: {
          drop_energy: { a: a.drop_energy, b: b.drop_energy },
          build_mean_energy: { a: a.build_mean_energy, b: b.build_mean_energy },
          impact: { a: a.impact, b: b.impact },
          impact_score: { a: a.impact_score, b: b.impact_score },
        },
      });
    }
  }

  const drop_to_drop_similarity: StructureAnalysisV1["drop_to_drop_similarity"] = {
    pairs: dropSimilarityPairs,
    highest_similarity_0_1:
      dropSimilarityPairs.length > 0
        ? Math.max(...dropSimilarityPairs.map((pair) => pair.similarity_0_1))
        : null,
    mean_similarity_0_1:
      dropSimilarityPairs.length > 0
        ? mean(dropSimilarityPairs.map((pair) => pair.similarity_0_1))
        : null,
  };

  const decision_inputs: StructureAnalysisV1["decision_inputs"] = {
    repetition_ratio_0_1,
    unique_section_count,
    transition_strength_0_1,
    novelty_change_strength_0_1,
    section_similarity_highest_0_1: section_similarity.highest_similarity_0_1,
    section_similarity_mean_0_1: section_similarity.mean_similarity_0_1,
    drop_to_drop_similarity_highest_0_1: drop_to_drop_similarity.highest_similarity_0_1,
    drop_to_drop_similarity_mean_0_1: drop_to_drop_similarity.mean_similarity_0_1,
    declared_main_genre: declaredMainGenre,
    declared_subgenre: declaredSubgenre,
    declared_reference_artist: declaredReferenceArtist,
    declared_reference_track: declaredReferenceTrack,
  };

  const decision_metric_snapshot = {
    repetition_ratio_0_1,
    unique_section_count,
    transition_strength_0_1,
    novelty_change_strength_0_1,
    section_similarity_highest_0_1: section_similarity.highest_similarity_0_1,
    section_similarity_mean_0_1: section_similarity.mean_similarity_0_1,
    drop_to_drop_similarity_highest_0_1: drop_to_drop_similarity.highest_similarity_0_1,
    drop_to_drop_similarity_mean_0_1: drop_to_drop_similarity.mean_similarity_0_1,
  };

  const repetitiveThresholds =
    genreRuleProfileKey === "trance_like" || genreRuleProfileKey === "house_edm_like"
      ? {
          repetition_min: 0.68,
          novelty_max: 0.42,
        }
      : genreRuleProfileKey === "rock_metal_like" || genreRuleProfileKey === "pop_urban_like"
        ? {
            repetition_min: 0.52,
            novelty_max: 0.48,
          }
        : {
            repetition_min: 0.6,
            novelty_max: 0.45,
          };

  const balancedThresholds =
    genreRuleProfileKey === "trance_like" || genreRuleProfileKey === "house_edm_like"
      ? {
          repetition_max: 0.55,
          novelty_min: 0.5,
          transition_min: 0.42,
        }
      : genreRuleProfileKey === "rock_metal_like" || genreRuleProfileKey === "pop_urban_like"
        ? {
            repetition_max: 0.38,
            novelty_min: 0.58,
            transition_min: 0.48,
          }
        : {
            repetition_max: 0.45,
            novelty_min: 0.55,
            transition_min: 0.45,
          };

  const thresholdProfileSource: NonNullable<
    StructureAnalysisV1["decision_trace"]
  >["threshold_profile_source"] =
    genreRuleProfileKey === "trance_like" ||
    genreRuleProfileKey === "house_edm_like" ||
    genreRuleProfileKey === "rock_metal_like" ||
    genreRuleProfileKey === "pop_urban_like"
      ? "genre_profile"
      : "default_profile";

  const similarityThresholds =
    genreRuleProfileKey === "trance_like" || genreRuleProfileKey === "house_edm_like"
      ? {
          repetitive: {
            section_similarity_mean_min: 0.66,
            drop_to_drop_similarity_mean_min: 0.78,
          },
          balanced: {
            section_similarity_mean_max: 0.74,
            drop_to_drop_similarity_mean_max: 0.84,
          },
        }
      : genreRuleProfileKey === "rock_metal_like" ||
          genreRuleProfileKey === "pop_urban_like"
        ? {
            repetitive: {
              section_similarity_mean_min: 0.54,
              drop_to_drop_similarity_mean_min: 0.66,
            },
            balanced: {
              section_similarity_mean_max: 0.62,
              drop_to_drop_similarity_mean_max: 0.72,
            },
          }
        : {
            repetitive: {
              section_similarity_mean_min: 0.6,
              drop_to_drop_similarity_mean_min: 0.72,
            },
            balanced: {
              section_similarity_mean_max: 0.68,
              drop_to_drop_similarity_mean_max: 0.78,
            },
          };

  const underdevelopedThresholds =
    genreRuleProfileKey === "trance_like" || genreRuleProfileKey === "house_edm_like"
      ? {
          unique_section_count_max: 2,
          transition_max: 0.34,
          novelty_max: 0.36,
        }
      : genreRuleProfileKey === "rock_metal_like" ||
          genreRuleProfileKey === "pop_urban_like"
        ? {
            unique_section_count_max: 3,
            transition_max: 0.46,
            novelty_max: 0.5,
          }
        : {
            unique_section_count_max: 2,
            transition_max: 0.4,
            novelty_max: 0.42,
          };

  const decision_threshold_profile = {
    active_genre_profile: genreRuleProfileKey,
    threshold_profile_source: thresholdProfileSource,
    repetitive_thresholds: repetitiveThresholds,
    balanced_thresholds: balancedThresholds,
    underdeveloped_thresholds: underdevelopedThresholds,
    similarity_thresholds: similarityThresholds,
  };

  const decision_rule_context: StructureAnalysisV1["decision_rule_context"] = {
    active_genre_profile: decision_threshold_profile.active_genre_profile,
    repetitive_thresholds: decision_threshold_profile.repetitive_thresholds,
    balanced_thresholds: decision_threshold_profile.balanced_thresholds,
    underdeveloped_thresholds: decision_threshold_profile.underdeveloped_thresholds,
  similarity_thresholds: decision_threshold_profile.similarity_thresholds,
  };

  const repetitiveRuleChecks = {
    repetition_ratio_present: decision_metric_snapshot.repetition_ratio_0_1 !== null,
    novelty_present: decision_metric_snapshot.novelty_change_strength_0_1 !== null,
    section_similarity_mean_present:
      decision_metric_snapshot.section_similarity_mean_0_1 !== null,
    drop_similarity_mean_present:
      decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 !== null,
    repetition_threshold_passed:
      decision_metric_snapshot.repetition_ratio_0_1 !== null &&
      decision_metric_snapshot.repetition_ratio_0_1 >=
        decision_threshold_profile.repetitive_thresholds.repetition_min,
    novelty_threshold_passed:
      decision_metric_snapshot.novelty_change_strength_0_1 !== null &&
      decision_metric_snapshot.novelty_change_strength_0_1 <=
        decision_threshold_profile.repetitive_thresholds.novelty_max,
    section_similarity_threshold_passed:
      decision_metric_snapshot.section_similarity_mean_0_1 === null ||
    decision_metric_snapshot.section_similarity_mean_0_1 >=
      decision_threshold_profile.similarity_thresholds.repetitive.section_similarity_mean_min,
    drop_similarity_threshold_passed:
      decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 === null ||
    decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 >=
      decision_threshold_profile.similarity_thresholds.repetitive.drop_to_drop_similarity_mean_min,
  };

  const underdevelopedRuleChecks = {
    unique_section_count_present: decision_metric_snapshot.unique_section_count !== null,
    transition_present: decision_metric_snapshot.transition_strength_0_1 !== null,
    novelty_present: decision_metric_snapshot.novelty_change_strength_0_1 !== null,
    unique_section_count_threshold_passed:
      decision_metric_snapshot.unique_section_count !== null &&
      decision_metric_snapshot.unique_section_count <=
        decision_threshold_profile.underdeveloped_thresholds.unique_section_count_max,
    transition_threshold_passed:
      decision_metric_snapshot.transition_strength_0_1 !== null &&
      decision_metric_snapshot.transition_strength_0_1 <=
        decision_threshold_profile.underdeveloped_thresholds.transition_max,
    novelty_threshold_passed:
      decision_metric_snapshot.novelty_change_strength_0_1 !== null &&
      decision_metric_snapshot.novelty_change_strength_0_1 <=
        decision_threshold_profile.underdeveloped_thresholds.novelty_max,
  };

  const balancedRuleChecks = {
    repetition_ratio_present: decision_metric_snapshot.repetition_ratio_0_1 !== null,
    novelty_present: decision_metric_snapshot.novelty_change_strength_0_1 !== null,
    transition_present: decision_metric_snapshot.transition_strength_0_1 !== null,
    section_similarity_mean_present:
      decision_metric_snapshot.section_similarity_mean_0_1 !== null,
    drop_similarity_mean_present:
      decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 !== null,
    repetition_threshold_passed:
      decision_metric_snapshot.repetition_ratio_0_1 !== null &&
      decision_metric_snapshot.repetition_ratio_0_1 <=
        decision_threshold_profile.balanced_thresholds.repetition_max,
    novelty_threshold_passed:
      decision_metric_snapshot.novelty_change_strength_0_1 !== null &&
      decision_metric_snapshot.novelty_change_strength_0_1 >=
        decision_threshold_profile.balanced_thresholds.novelty_min,
    transition_threshold_passed:
      decision_metric_snapshot.transition_strength_0_1 !== null &&
      decision_metric_snapshot.transition_strength_0_1 >=
        decision_threshold_profile.balanced_thresholds.transition_min,
    section_similarity_threshold_passed:
      decision_metric_snapshot.section_similarity_mean_0_1 === null ||
    decision_metric_snapshot.section_similarity_mean_0_1 <=
      decision_threshold_profile.similarity_thresholds.balanced.section_similarity_mean_max,
    drop_similarity_threshold_passed:
      decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 === null ||
    decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 <=
      decision_threshold_profile.similarity_thresholds.balanced.drop_to_drop_similarity_mean_max,
  };

  const decision_rule_evaluation = {
    repetitive: {
      matched:
        repetitiveRuleChecks.repetition_ratio_present &&
        repetitiveRuleChecks.novelty_present &&
        repetitiveRuleChecks.repetition_threshold_passed &&
        repetitiveRuleChecks.novelty_threshold_passed &&
        repetitiveRuleChecks.section_similarity_threshold_passed &&
        repetitiveRuleChecks.drop_similarity_threshold_passed,
      passed_conditions: [
        repetitiveRuleChecks.repetition_ratio_present ? "repetition_ratio_present" : null,
        repetitiveRuleChecks.novelty_present ? "novelty_change_strength_present" : null,
        repetitiveRuleChecks.section_similarity_mean_present
          ? "section_similarity_mean_present"
          : null,
        repetitiveRuleChecks.drop_similarity_mean_present
          ? "drop_to_drop_similarity_mean_present"
          : null,
        repetitiveRuleChecks.repetition_threshold_passed
          ? "repetition_ratio_meets_min_threshold"
          : null,
        repetitiveRuleChecks.novelty_threshold_passed
          ? "novelty_change_strength_meets_max_threshold"
          : null,
        repetitiveRuleChecks.section_similarity_mean_present &&
        repetitiveRuleChecks.section_similarity_threshold_passed
          ? "section_similarity_mean_supports_repetitive"
          : null,
        repetitiveRuleChecks.drop_similarity_mean_present &&
        repetitiveRuleChecks.drop_similarity_threshold_passed
          ? "drop_to_drop_similarity_supports_repetitive"
          : null,
      ].filter((value): value is string => value !== null),
      failed_conditions: [
        !repetitiveRuleChecks.repetition_ratio_present ? "repetition_ratio_missing" : null,
        !repetitiveRuleChecks.novelty_present
          ? "novelty_change_strength_missing"
          : null,
        repetitiveRuleChecks.repetition_ratio_present &&
        !repetitiveRuleChecks.repetition_threshold_passed
          ? "repetition_ratio_below_min_threshold"
          : null,
        repetitiveRuleChecks.novelty_present &&
        !repetitiveRuleChecks.novelty_threshold_passed
          ? "novelty_change_strength_above_max_threshold"
          : null,
        repetitiveRuleChecks.section_similarity_mean_present &&
        !repetitiveRuleChecks.section_similarity_threshold_passed
          ? "section_similarity_mean_too_low_for_repetitive"
          : null,
        repetitiveRuleChecks.drop_similarity_mean_present &&
        !repetitiveRuleChecks.drop_similarity_threshold_passed
          ? "drop_to_drop_similarity_too_low_for_repetitive"
          : null,
      ].filter((value): value is string => value !== null),
      key_threshold_comparisons: {
        repetition_ratio_0_1: {
          value: decision_metric_snapshot.repetition_ratio_0_1,
          threshold: decision_threshold_profile.repetitive_thresholds.repetition_min,
          passed: repetitiveRuleChecks.repetition_threshold_passed,
        },
        novelty_change_strength_0_1: {
          value: decision_metric_snapshot.novelty_change_strength_0_1,
          threshold: decision_threshold_profile.repetitive_thresholds.novelty_max,
          passed: repetitiveRuleChecks.novelty_threshold_passed,
        },
        section_similarity_mean_0_1: {
          value: decision_metric_snapshot.section_similarity_mean_0_1,
          threshold:
            decision_threshold_profile.similarity_thresholds.repetitive
              .section_similarity_mean_min,
          passed: repetitiveRuleChecks.section_similarity_threshold_passed,
        },
        drop_to_drop_similarity_mean_0_1: {
          value: decision_metric_snapshot.drop_to_drop_similarity_mean_0_1,
          threshold:
            decision_threshold_profile.similarity_thresholds.repetitive
              .drop_to_drop_similarity_mean_min,
          passed: repetitiveRuleChecks.drop_similarity_threshold_passed,
        },
      },
      status_candidate: "repetitive" as const,
      primary_reason_candidate: "high_repetition_low_novelty" as const,
      next_action_candidate: "increase_section_contrast" as const,
      evidence_snapshot: {
        repetition_ratio_0_1: decision_metric_snapshot.repetition_ratio_0_1,
        unique_section_count: decision_metric_snapshot.unique_section_count,
        transition_strength_0_1: decision_metric_snapshot.transition_strength_0_1,
        novelty_change_strength_0_1: decision_metric_snapshot.novelty_change_strength_0_1,
        section_similarity_mean_0_1: decision_metric_snapshot.section_similarity_mean_0_1,
        drop_to_drop_similarity_mean_0_1:
          decision_metric_snapshot.drop_to_drop_similarity_mean_0_1,
      },
    },
    underdeveloped: {
      matched:
        underdevelopedRuleChecks.unique_section_count_present &&
        underdevelopedRuleChecks.unique_section_count_threshold_passed &&
        underdevelopedRuleChecks.transition_present &&
        underdevelopedRuleChecks.transition_threshold_passed &&
        underdevelopedRuleChecks.novelty_present &&
        underdevelopedRuleChecks.novelty_threshold_passed,
      passed_conditions: [
        underdevelopedRuleChecks.unique_section_count_present
          ? "unique_section_count_present"
          : null,
        underdevelopedRuleChecks.transition_present
          ? "transition_strength_present"
          : null,
        underdevelopedRuleChecks.novelty_present
          ? "novelty_change_strength_present"
          : null,
        underdevelopedRuleChecks.unique_section_count_threshold_passed
          ? "unique_section_count_meets_max_threshold"
          : null,
        underdevelopedRuleChecks.transition_threshold_passed
          ? "transition_strength_meets_max_threshold"
          : null,
        underdevelopedRuleChecks.novelty_threshold_passed
          ? "novelty_change_strength_meets_max_threshold"
          : null,
      ].filter((value): value is string => value !== null),
      failed_conditions: [
        !underdevelopedRuleChecks.unique_section_count_present
          ? "unique_section_count_missing"
          : null,
        !underdevelopedRuleChecks.transition_present
          ? "transition_strength_missing"
          : null,
        !underdevelopedRuleChecks.novelty_present
          ? "novelty_change_strength_missing"
          : null,
        underdevelopedRuleChecks.unique_section_count_present &&
        !underdevelopedRuleChecks.unique_section_count_threshold_passed
          ? "unique_section_count_above_max_threshold"
          : null,
        underdevelopedRuleChecks.transition_present &&
        !underdevelopedRuleChecks.transition_threshold_passed
          ? "transition_strength_above_max_threshold"
          : null,
        underdevelopedRuleChecks.novelty_present &&
        !underdevelopedRuleChecks.novelty_threshold_passed
          ? "novelty_change_strength_above_max_threshold"
          : null,
      ].filter((value): value is string => value !== null),
      key_threshold_comparisons: {
        unique_section_count: {
          value: decision_metric_snapshot.unique_section_count,
          threshold:
            decision_threshold_profile.underdeveloped_thresholds.unique_section_count_max,
          passed: underdevelopedRuleChecks.unique_section_count_threshold_passed,
        },
        transition_strength_0_1: {
          value: decision_metric_snapshot.transition_strength_0_1,
          threshold: decision_threshold_profile.underdeveloped_thresholds.transition_max,
          passed: underdevelopedRuleChecks.transition_threshold_passed,
        },
        novelty_change_strength_0_1: {
          value: decision_metric_snapshot.novelty_change_strength_0_1,
          threshold: decision_threshold_profile.underdeveloped_thresholds.novelty_max,
          passed: underdevelopedRuleChecks.novelty_threshold_passed,
        },
      },
      status_candidate: "underdeveloped" as const,
      primary_reason_candidate: "low_section_count_weak_transitions" as const,
      next_action_candidate: "add_or_strengthen_structural_change" as const,
      evidence_snapshot: {
        repetition_ratio_0_1: decision_metric_snapshot.repetition_ratio_0_1,
        unique_section_count: decision_metric_snapshot.unique_section_count,
        transition_strength_0_1: decision_metric_snapshot.transition_strength_0_1,
        novelty_change_strength_0_1: decision_metric_snapshot.novelty_change_strength_0_1,
        section_similarity_mean_0_1: decision_metric_snapshot.section_similarity_mean_0_1,
        drop_to_drop_similarity_mean_0_1:
          decision_metric_snapshot.drop_to_drop_similarity_mean_0_1,
      },
    },
    balanced: {
      matched:
        balancedRuleChecks.repetition_ratio_present &&
        balancedRuleChecks.repetition_threshold_passed &&
        balancedRuleChecks.novelty_present &&
        balancedRuleChecks.novelty_threshold_passed &&
        balancedRuleChecks.transition_present &&
        balancedRuleChecks.transition_threshold_passed &&
        balancedRuleChecks.section_similarity_threshold_passed &&
        balancedRuleChecks.drop_similarity_threshold_passed,
      passed_conditions: [
        balancedRuleChecks.repetition_ratio_present ? "repetition_ratio_present" : null,
        balancedRuleChecks.novelty_present ? "novelty_change_strength_present" : null,
        balancedRuleChecks.transition_present ? "transition_strength_present" : null,
        balancedRuleChecks.section_similarity_mean_present
          ? "section_similarity_mean_present"
          : null,
        balancedRuleChecks.drop_similarity_mean_present
          ? "drop_to_drop_similarity_mean_present"
          : null,
        balancedRuleChecks.repetition_threshold_passed
          ? "repetition_ratio_meets_max_threshold"
          : null,
        balancedRuleChecks.novelty_threshold_passed
          ? "novelty_change_strength_meets_min_threshold"
          : null,
        balancedRuleChecks.transition_threshold_passed
          ? "transition_strength_meets_min_threshold"
          : null,
        balancedRuleChecks.section_similarity_mean_present &&
        balancedRuleChecks.section_similarity_threshold_passed
          ? "section_similarity_mean_supports_balanced"
          : null,
        balancedRuleChecks.drop_similarity_mean_present &&
        balancedRuleChecks.drop_similarity_threshold_passed
          ? "drop_to_drop_similarity_supports_balanced"
          : null,
      ].filter((value): value is string => value !== null),
      failed_conditions: [
        !balancedRuleChecks.repetition_ratio_present ? "repetition_ratio_missing" : null,
        !balancedRuleChecks.novelty_present
          ? "novelty_change_strength_missing"
          : null,
        !balancedRuleChecks.transition_present ? "transition_strength_missing" : null,
        balancedRuleChecks.repetition_ratio_present &&
        !balancedRuleChecks.repetition_threshold_passed
          ? "repetition_ratio_above_max_threshold"
          : null,
        balancedRuleChecks.novelty_present &&
        !balancedRuleChecks.novelty_threshold_passed
          ? "novelty_change_strength_below_min_threshold"
          : null,
        balancedRuleChecks.transition_present &&
        !balancedRuleChecks.transition_threshold_passed
          ? "transition_strength_below_min_threshold"
          : null,
        balancedRuleChecks.section_similarity_mean_present &&
        !balancedRuleChecks.section_similarity_threshold_passed
          ? "section_similarity_mean_too_high_for_balanced"
          : null,
        balancedRuleChecks.drop_similarity_mean_present &&
        !balancedRuleChecks.drop_similarity_threshold_passed
          ? "drop_to_drop_similarity_too_high_for_balanced"
          : null,
      ].filter((value): value is string => value !== null),
      key_threshold_comparisons: {
        repetition_ratio_0_1: {
          value: decision_metric_snapshot.repetition_ratio_0_1,
          threshold: decision_threshold_profile.balanced_thresholds.repetition_max,
          passed: balancedRuleChecks.repetition_threshold_passed,
        },
        novelty_change_strength_0_1: {
          value: decision_metric_snapshot.novelty_change_strength_0_1,
          threshold: decision_threshold_profile.balanced_thresholds.novelty_min,
          passed: balancedRuleChecks.novelty_threshold_passed,
        },
        transition_strength_0_1: {
          value: decision_metric_snapshot.transition_strength_0_1,
          threshold: decision_threshold_profile.balanced_thresholds.transition_min,
          passed: balancedRuleChecks.transition_threshold_passed,
        },
        section_similarity_mean_0_1: {
          value: decision_metric_snapshot.section_similarity_mean_0_1,
          threshold:
            decision_threshold_profile.similarity_thresholds.balanced
              .section_similarity_mean_max,
          passed: balancedRuleChecks.section_similarity_threshold_passed,
        },
        drop_to_drop_similarity_mean_0_1: {
          value: decision_metric_snapshot.drop_to_drop_similarity_mean_0_1,
          threshold:
            decision_threshold_profile.similarity_thresholds.balanced
              .drop_to_drop_similarity_mean_max,
          passed: balancedRuleChecks.drop_similarity_threshold_passed,
        },
      },
      status_candidate: "balanced" as const,
      primary_reason_candidate: "healthy_variation_and_transitions" as const,
      next_action_candidate: "preserve_structure_refine_details" as const,
      evidence_snapshot: {
        repetition_ratio_0_1: decision_metric_snapshot.repetition_ratio_0_1,
        unique_section_count: decision_metric_snapshot.unique_section_count,
        transition_strength_0_1: decision_metric_snapshot.transition_strength_0_1,
        novelty_change_strength_0_1: decision_metric_snapshot.novelty_change_strength_0_1,
        section_similarity_mean_0_1: decision_metric_snapshot.section_similarity_mean_0_1,
        drop_to_drop_similarity_mean_0_1:
          decision_metric_snapshot.drop_to_drop_similarity_mean_0_1,
      },
    },
  };

  const decision_resolution = decision_rule_evaluation.repetitive.matched
    ? decision_rule_evaluation.repetitive
    : decision_rule_evaluation.underdeveloped.matched
      ? decision_rule_evaluation.underdeveloped
      : decision_rule_evaluation.balanced.matched
        ? decision_rule_evaluation.balanced
        : {
            matched: false,
            passed_conditions: [],
            failed_conditions: [],
            key_threshold_comparisons: null,
            status_candidate: "unclear" as const,
            primary_reason_candidate: "mixed_or_insufficient_signals" as const,
            next_action_candidate: "review_structure_manually" as const,
            evidence_snapshot: {
              repetition_ratio_0_1: decision_metric_snapshot.repetition_ratio_0_1,
              unique_section_count: decision_metric_snapshot.unique_section_count,
              transition_strength_0_1: decision_metric_snapshot.transition_strength_0_1,
              novelty_change_strength_0_1:
                decision_metric_snapshot.novelty_change_strength_0_1,
              section_similarity_mean_0_1: decision_metric_snapshot.section_similarity_mean_0_1,
              drop_to_drop_similarity_mean_0_1:
                decision_metric_snapshot.drop_to_drop_similarity_mean_0_1,
            },
          };

  const decision_candidate: StructureAnalysisV1["decision_candidate"] = {
    status_candidate: decision_resolution.status_candidate,
    primary_reason_candidate: decision_resolution.primary_reason_candidate,
    next_action_candidate: decision_resolution.next_action_candidate,
    evidence_snapshot: decision_resolution.evidence_snapshot,
  };

  const decision_trace_close_calls = [
    !decision_rule_evaluation.repetitive.matched &&
    decision_metric_snapshot.repetition_ratio_0_1 !== null &&
    Math.abs(
      decision_metric_snapshot.repetition_ratio_0_1 -
        decision_threshold_profile.repetitive_thresholds.repetition_min
    ) <= 0.03
      ? "repetitive_repetition_ratio_near_threshold"
      : null,
    !decision_rule_evaluation.repetitive.matched &&
    decision_metric_snapshot.novelty_change_strength_0_1 !== null &&
    Math.abs(
      decision_metric_snapshot.novelty_change_strength_0_1 -
        decision_threshold_profile.repetitive_thresholds.novelty_max
    ) <= 0.03
      ? "repetitive_novelty_near_threshold"
      : null,
    !decision_rule_evaluation.repetitive.matched &&
    decision_metric_snapshot.section_similarity_mean_0_1 !== null &&
  Math.abs(
    decision_metric_snapshot.section_similarity_mean_0_1 -
      decision_threshold_profile.similarity_thresholds.repetitive.section_similarity_mean_min
  ) <= 0.03
      ? "repetitive_section_similarity_near_threshold"
      : null,
    !decision_rule_evaluation.repetitive.matched &&
    decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 !== null &&
  Math.abs(
    decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 -
      decision_threshold_profile.similarity_thresholds.repetitive.drop_to_drop_similarity_mean_min
  ) <= 0.03
      ? "repetitive_drop_similarity_near_threshold"
      : null,
    !decision_rule_evaluation.underdeveloped.matched &&
    decision_metric_snapshot.unique_section_count !== null &&
    Math.abs(
      decision_metric_snapshot.unique_section_count -
        decision_threshold_profile.underdeveloped_thresholds.unique_section_count_max
    ) <= 1
      ? "underdeveloped_unique_section_count_near_threshold"
      : null,
    !decision_rule_evaluation.underdeveloped.matched &&
    decision_metric_snapshot.transition_strength_0_1 !== null &&
    Math.abs(
      decision_metric_snapshot.transition_strength_0_1 -
        decision_threshold_profile.underdeveloped_thresholds.transition_max
    ) <= 0.03
      ? "underdeveloped_transition_strength_near_threshold"
      : null,
    !decision_rule_evaluation.underdeveloped.matched &&
    decision_metric_snapshot.novelty_change_strength_0_1 !== null &&
    Math.abs(
      decision_metric_snapshot.novelty_change_strength_0_1 -
        decision_threshold_profile.underdeveloped_thresholds.novelty_max
    ) <= 0.03
      ? "underdeveloped_novelty_near_threshold"
      : null,
    !decision_rule_evaluation.balanced.matched &&
    decision_metric_snapshot.repetition_ratio_0_1 !== null &&
    Math.abs(
      decision_metric_snapshot.repetition_ratio_0_1 -
        decision_threshold_profile.balanced_thresholds.repetition_max
    ) <= 0.03
      ? "balanced_repetition_ratio_near_threshold"
      : null,
    !decision_rule_evaluation.balanced.matched &&
    decision_metric_snapshot.novelty_change_strength_0_1 !== null &&
    Math.abs(
      decision_metric_snapshot.novelty_change_strength_0_1 -
        decision_threshold_profile.balanced_thresholds.novelty_min
    ) <= 0.03
      ? "balanced_novelty_near_threshold"
      : null,
    !decision_rule_evaluation.balanced.matched &&
    decision_metric_snapshot.transition_strength_0_1 !== null &&
    Math.abs(
      decision_metric_snapshot.transition_strength_0_1 -
        decision_threshold_profile.balanced_thresholds.transition_min
    ) <= 0.03
      ? "balanced_transition_strength_near_threshold"
      : null,
    !decision_rule_evaluation.balanced.matched &&
    decision_metric_snapshot.section_similarity_mean_0_1 !== null &&
  Math.abs(
    decision_metric_snapshot.section_similarity_mean_0_1 -
      decision_threshold_profile.similarity_thresholds.balanced.section_similarity_mean_max
  ) <= 0.03
      ? "balanced_section_similarity_near_threshold"
      : null,
    !decision_rule_evaluation.balanced.matched &&
    decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 !== null &&
  Math.abs(
    decision_metric_snapshot.drop_to_drop_similarity_mean_0_1 -
      decision_threshold_profile.similarity_thresholds.balanced.drop_to_drop_similarity_mean_max
  ) <= 0.03
      ? "balanced_drop_similarity_near_threshold"
      : null,
  ].filter((value): value is string => value !== null);

  const decision_trace: StructureAnalysisV1["decision_trace"] = {
    matched_rule_branch: decision_candidate.status_candidate,
    threshold_profile_source: decision_threshold_profile.threshold_profile_source,
    branch_results: {
      repetitive: {
        matched: decision_rule_evaluation.repetitive.matched,
        passed_conditions: decision_rule_evaluation.repetitive.passed_conditions,
        failed_conditions: decision_rule_evaluation.repetitive.failed_conditions,
      },
      underdeveloped: {
        matched: decision_rule_evaluation.underdeveloped.matched,
        passed_conditions: decision_rule_evaluation.underdeveloped.passed_conditions,
        failed_conditions: decision_rule_evaluation.underdeveloped.failed_conditions,
      },
      balanced: {
        matched: decision_rule_evaluation.balanced.matched,
        passed_conditions: decision_rule_evaluation.balanced.passed_conditions,
        failed_conditions: decision_rule_evaluation.balanced.failed_conditions,
      },
    },
    selected_branch_reason:
      decision_candidate.status_candidate === "unclear"
        ? "fallback_unclear_no_rule_matched"
        : "matched_priority_rule",
    key_threshold_comparisons: {
      repetitive: decision_rule_evaluation.repetitive.key_threshold_comparisons,
      underdeveloped: decision_rule_evaluation.underdeveloped.key_threshold_comparisons,
      balanced: decision_rule_evaluation.balanced.key_threshold_comparisons,
    },
    close_calls: decision_trace_close_calls,
  };

  const decisionConfidenceInputs = {
    core_metric_presence_count: [
      decision_metric_snapshot.repetition_ratio_0_1,
      decision_metric_snapshot.unique_section_count,
      decision_metric_snapshot.transition_strength_0_1,
      decision_metric_snapshot.novelty_change_strength_0_1,
    ].filter((value) => value !== null).length,
    matched_branch_count: [
      decision_trace.branch_results.repetitive.matched,
      decision_trace.branch_results.underdeveloped.matched,
      decision_trace.branch_results.balanced.matched,
    ].filter(Boolean).length,
    close_call_count: decision_trace.close_calls.length,
    selected_branch_is_unclear: decision_candidate.status_candidate === "unclear",
  };

  const decisionConfidenceLevel: NonNullable<
    StructureAnalysisV1["decision_summary"]
  >["confidence_level"] =
    decisionConfidenceInputs.selected_branch_is_unclear
      ? "low"
      : decisionConfidenceInputs.core_metric_presence_count === 4 &&
          decisionConfidenceInputs.matched_branch_count === 1 &&
          decisionConfidenceInputs.close_call_count === 0
        ? "high"
        : decisionConfidenceInputs.core_metric_presence_count >= 3 &&
            decisionConfidenceInputs.matched_branch_count === 1 &&
            decisionConfidenceInputs.close_call_count <= 2
          ? "medium"
          : "low";

  const decision_summary: StructureAnalysisV1["decision_summary"] = {
    status: decision_candidate.status_candidate,
    main_reason: decision_candidate.primary_reason_candidate,
    next_action: decision_candidate.next_action_candidate,
    confidence_level: decisionConfidenceLevel,
    evidence: {
      repetition_ratio_0_1,
      unique_section_count,
      transition_strength_0_1,
      novelty_change_strength_0_1,
      section_similarity_mean_0_1: decision_metric_snapshot.section_similarity_mean_0_1,
      drop_to_drop_similarity_mean_0_1:
        decision_metric_snapshot.drop_to_drop_similarity_mean_0_1,
    },
  };

  const explanation_inputs: StructureAnalysisV1["explanation_inputs"] = {
    status: decision_summary.status,
    main_reason: decision_summary.main_reason,
    next_action: decision_summary.next_action,
    confidence_level: decision_summary.confidence_level,
    matched_rule_branch: decision_trace.matched_rule_branch,
    threshold_profile_source: decision_trace.threshold_profile_source,
    active_genre_profile: decision_rule_context.active_genre_profile,
    declared_main_genre: declaredMainGenre,
    declared_subgenre: declaredSubgenre,
    declared_reference_artist: declaredReferenceArtist,
    declared_reference_track: declaredReferenceTrack,
    evidence: {
      repetition_ratio_0_1: decision_summary.evidence.repetition_ratio_0_1,
      unique_section_count: decision_summary.evidence.unique_section_count,
      transition_strength_0_1: decision_summary.evidence.transition_strength_0_1,
      novelty_change_strength_0_1: decision_summary.evidence.novelty_change_strength_0_1,
      section_similarity_mean_0_1:
        decision_summary.evidence.section_similarity_mean_0_1,
      drop_to_drop_similarity_mean_0_1:
        decision_summary.evidence.drop_to_drop_similarity_mean_0_1,
    },
  };

  const similaritySignalUnavailable =
    explanation_inputs.evidence.section_similarity_mean_0_1 === null &&
    explanation_inputs.evidence.drop_to_drop_similarity_mean_0_1 === null;

  const similaritySupportsRepetition =
    (explanation_inputs.evidence.section_similarity_mean_0_1 !== null &&
      explanation_inputs.evidence.section_similarity_mean_0_1 >=
        decision_rule_context.similarity_thresholds.repetitive.section_similarity_mean_min) ||
    (explanation_inputs.evidence.drop_to_drop_similarity_mean_0_1 !== null &&
      explanation_inputs.evidence.drop_to_drop_similarity_mean_0_1 >=
        decision_rule_context.similarity_thresholds.repetitive
          .drop_to_drop_similarity_mean_min);

  const similaritySupportsBalance =
    explanation_inputs.evidence.section_similarity_mean_0_1 !== null &&
    explanation_inputs.evidence.section_similarity_mean_0_1 <=
      decision_rule_context.similarity_thresholds.balanced.section_similarity_mean_max &&
    explanation_inputs.evidence.drop_to_drop_similarity_mean_0_1 !== null &&
    explanation_inputs.evidence.drop_to_drop_similarity_mean_0_1 <=
      decision_rule_context.similarity_thresholds.balanced
        .drop_to_drop_similarity_mean_max;

  const explanation_candidate: StructureAnalysisV1["explanation_candidate"] = {
    tone:
      decision_summary.status === "balanced"
        ? "affirming"
        : decision_summary.status === "repetitive" ||
            decision_summary.status === "underdeveloped"
          ? "corrective"
          : "cautious",
    focus:
      decision_summary.main_reason === "high_repetition_low_novelty"
        ? "variation"
        : decision_summary.main_reason === "low_section_count_weak_transitions"
          ? "structure_growth"
          : decision_summary.main_reason === "healthy_variation_and_transitions"
            ? "preserve_strength"
            : "manual_review",
    caution_level:
      decision_summary.confidence_level === "high"
        ? "low"
        : decision_summary.confidence_level === "medium"
          ? "medium"
          : "high",
    similarity_read: similaritySignalUnavailable
      ? "similarity_signal_unavailable"
      : similaritySupportsRepetition && !similaritySupportsBalance
        ? "pattern_reinforces_repetition"
        : similaritySupportsBalance && !similaritySupportsRepetition
          ? "pattern_supports_balance"
          : "pattern_is_mixed",
  };

  const wording_plan: StructureAnalysisV1["wording_plan"] = {
    headline_key:
      decision_summary.status === "balanced"
        ? "balanced_structure"
        : decision_summary.status === "repetitive"
          ? "repetition_warning"
          : decision_summary.status === "underdeveloped"
            ? "structure_growth_needed"
            : "manual_review_needed",
    body_focus_key:
      explanation_candidate.focus === "preserve_strength"
        ? "highlight_strengths"
        : explanation_candidate.focus === "variation"
          ? "increase_variation"
          : explanation_candidate.focus === "structure_growth"
            ? "strengthen_structure_changes"
            : "explain_uncertainty",
    caution_mode: explanation_candidate.caution_level,
    similarity_emphasis:
      explanation_candidate.similarity_read === "pattern_reinforces_repetition"
        ? "highlight_repetition_patterns"
        : explanation_candidate.similarity_read === "pattern_supports_balance"
          ? "highlight_balanced_patterns"
          : explanation_candidate.similarity_read === "pattern_is_mixed"
            ? "highlight_mixed_patterns"
            : "highlight_missing_similarity_context",
  };

  const wording_payload: StructureAnalysisV1["wording_payload"] = {
    headline_key: wording_plan.headline_key,
    body_focus_key: wording_plan.body_focus_key,
    caution_mode: wording_plan.caution_mode,
    similarity_emphasis: wording_plan.similarity_emphasis,
    status: decision_summary.status,
    main_reason: decision_summary.main_reason,
    next_action: decision_summary.next_action,
    confidence_level: decision_summary.confidence_level,
    active_genre_profile: decision_rule_context.active_genre_profile,
    declared_main_genre: declaredMainGenre,
    declared_subgenre: declaredSubgenre,
    declared_reference_artist: declaredReferenceArtist,
    declared_reference_track: declaredReferenceTrack,
    evidence: {
      repetition_ratio_0_1: decision_summary.evidence.repetition_ratio_0_1,
      unique_section_count: decision_summary.evidence.unique_section_count,
      transition_strength_0_1: decision_summary.evidence.transition_strength_0_1,
      novelty_change_strength_0_1: decision_summary.evidence.novelty_change_strength_0_1,
      section_similarity_mean_0_1:
        decision_summary.evidence.section_similarity_mean_0_1,
      drop_to_drop_similarity_mean_0_1:
        decision_summary.evidence.drop_to_drop_similarity_mean_0_1,
    },
  };

  const wording_guardrails: StructureAnalysisV1["wording_guardrails"] = {
    avoid_absolute_judgment: true,
    require_evidence_based_language: true,
    require_genre_relative_language: true,
    preserve_artistic_intent_space: true,
    require_similarity_context_caution: true,
    require_similarity_genre_relative_language: true,
    preferred_phrases: [
      "this suggests",
      "this indicates",
      "for the declared genre",
      "may benefit from",
      "could be strengthened by",
    ],
    forbidden_phrases: [
      "this is wrong",
      "this is bad",
      "this is boring",
      "this is objectively better",
      "this proves",
    ],
    similarity_preferred_phrases: [
      "similarity here may suggest",
      "these pattern relationships may indicate",
      "for the declared genre context",
      "this repeated structure could be intentional",
      "pattern similarity alone does not determine quality",
    ],
    similarity_forbidden_phrases: [
      "this similarity proves the structure is bad",
      "these repeated patterns are objectively wrong",
      "this track is boring because the patterns are similar",
      "the arrangement definitely lacks creativity",
      "similar sections automatically mean weak songwriting",
    ],
  };

  const consultant_payload: StructureAnalysisV1["consultant_payload"] = {
    decision: {
      status: decision_summary.status,
      main_reason: decision_summary.main_reason,
      next_action: decision_summary.next_action,
      confidence_level: decision_summary.confidence_level,
    },
    wording: {
      headline_key: wording_payload.headline_key,
      body_focus_key: wording_payload.body_focus_key,
      caution_mode: wording_payload.caution_mode,
      similarity_emphasis: wording_payload.similarity_emphasis,
    },
    similarity_read: explanation_candidate.similarity_read,
    guardrails: {
      avoid_absolute_judgment: wording_guardrails.avoid_absolute_judgment,
      require_evidence_based_language: wording_guardrails.require_evidence_based_language,
      require_genre_relative_language: wording_guardrails.require_genre_relative_language,
      preserve_artistic_intent_space: wording_guardrails.preserve_artistic_intent_space,
      require_similarity_context_caution:
        wording_guardrails.require_similarity_context_caution,
      require_similarity_genre_relative_language:
        wording_guardrails.require_similarity_genre_relative_language,
      preferred_phrases: wording_guardrails.preferred_phrases,
      forbidden_phrases: wording_guardrails.forbidden_phrases,
      similarity_preferred_phrases: wording_guardrails.similarity_preferred_phrases,
      similarity_forbidden_phrases: wording_guardrails.similarity_forbidden_phrases,
    },
    genre_context: {
      declared_main_genre: declaredMainGenre,
      declared_subgenre: declaredSubgenre,
      declared_reference_artist: declaredReferenceArtist,
      declared_reference_track: declaredReferenceTrack,
      active_genre_profile: decision_rule_context.active_genre_profile,
    },
    similarity_thresholds: {
      repetitive: {
        section_similarity_mean_min:
          decision_rule_context.similarity_thresholds.repetitive
            .section_similarity_mean_min,
        drop_to_drop_similarity_mean_min:
          decision_rule_context.similarity_thresholds.repetitive
            .drop_to_drop_similarity_mean_min,
      },
      balanced: {
        section_similarity_mean_max:
          decision_rule_context.similarity_thresholds.balanced
            .section_similarity_mean_max,
        drop_to_drop_similarity_mean_max:
          decision_rule_context.similarity_thresholds.balanced
            .drop_to_drop_similarity_mean_max,
      },
    },
    evidence: {
      repetition_ratio_0_1: wording_payload.evidence.repetition_ratio_0_1,
      unique_section_count: wording_payload.evidence.unique_section_count,
      transition_strength_0_1: wording_payload.evidence.transition_strength_0_1,
      novelty_change_strength_0_1: wording_payload.evidence.novelty_change_strength_0_1,
      section_similarity_mean_0_1:
        wording_payload.evidence.section_similarity_mean_0_1,
      drop_to_drop_similarity_mean_0_1:
        wording_payload.evidence.drop_to_drop_similarity_mean_0_1,
    },
  };

  const structural_balance = computeStructuralBalanceIndexV1({
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
  });

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
    stabilization: {
      ranges_before,
      ranges_after_stabilize,
      ranges_after_sequence,
      merges_estimated,
    },
    balance: structural_balance,
    sections,
    section_similarity,
    repetition_ratio_0_1,
    unique_section_count,
    transition_strength_0_1,
    novelty_change_strength_0_1,
    drop_to_drop_similarity,
    decision_inputs,
    decision_candidate,
    decision_rule_context,
    decision_trace,
    decision_summary,
    explanation_inputs,
    explanation_candidate,
    wording_plan,
    wording_payload,
    wording_guardrails,
    consultant_payload,
    genre_context: {
      declared_main_genre: declaredMainGenre,
      declared_subgenre: declaredSubgenre,
      declared_reference_artist: declaredReferenceArtist,
      declared_reference_track: declaredReferenceTrack,
    },
    genre_rule_context,
    genre_rule_profile,
  };
}
