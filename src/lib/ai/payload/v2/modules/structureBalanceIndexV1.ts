import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";

export type BalanceSectionTypeV1 = "intro" | "build" | "drop" | "break" | "outro";

export type StructuralBalanceResultV1 = {
  score_0_100: number; // higher = more evenly distributed (non-normative)
  dominant_section: BalanceSectionTypeV1 | null;
  shares_pct: Record<BalanceSectionTypeV1, number>; // 0..100
  features: {
    duration_s: number | null;
    covered_s: number; // how much of timeline was attributed to sections
    unclassified_s: number; // leftover time
    dominance_pct: number; // max share
    evenness_0_1: number; // 0..1 (Simpson evenness)
    drop_share_pct: number;
  };
  highlights: string[];
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function clamp100(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function toSectionType(x: any): BalanceSectionTypeV1 | null {
  return x === "intro" || x === "build" || x === "drop" || x === "break" || x === "outro" ? x : null;
}

/**
 * Modul 6 (V1): Structural Balance Index (deterministisch)
 *
 * Ziel:
 * - rein proportionale Beschreibung: wie verteilen sich Section-Typen über die Track-Zeit?
 * - kein Genre, keine Wertung, keine "richtig/falsch" Aussage
 *
 * Score-Idee (V1):
 * - Evenness (0..1) basierend auf Simpson evenness über Section-Shares
 * - Score = evenness * 100 (konservativ, leicht interpretierbar)
 *
 * Inputs:
 * - structure.sections
 */
export function computeStructuralBalanceIndexV1(structure: StructureAnalysisV1 | null | undefined): StructuralBalanceResultV1 {
  const empty: StructuralBalanceResultV1 = {
    score_0_100: 0,
    dominant_section: null,
    shares_pct: { intro: 0, build: 0, drop: 0, break: 0, outro: 0 },
    features: {
      duration_s: null,
      covered_s: 0,
      unclassified_s: 0,
      dominance_pct: 0,
      evenness_0_1: 0,
      drop_share_pct: 0,
    },
    highlights: ["Insufficient segment data for balance analysis."],
  };

  if (!structure || !Array.isArray(structure.sections) || structure.sections.length === 0) return empty;
  if (!Array.isArray(structure.energy_curve) || structure.energy_curve.length < 3) return empty;

  const t0 = structure.energy_curve[0]!.t;
  const t1 = structure.energy_curve[structure.energy_curve.length - 1]!.t;
  const duration_s = Number.isFinite(t1 - t0) && t1 > t0 ? t1 - t0 : null;
  if (duration_s == null || duration_s <= 0) return empty;

  // 1) Collect segment durations (ignore type entirely)
  const segDur: number[] = [];
  for (const s of structure.sections) {
    if (!s || typeof s !== "object") continue;
    if (!("start" in (s as any)) || !("end" in (s as any))) continue;

    const start = (s as any).start;
    const end = (s as any).end;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    const d = Math.max(0, end - start);
    if (d > 0) segDur.push(d);
  }

  if (segDur.length < 2) return empty;

  const covered_s = segDur.reduce((a, b) => a + b, 0);
  const unclassified_s = Math.max(0, duration_s - covered_s);

  // 2) Shares (segment-length share of total duration)
  const sharesSeg = segDur.map((d) => clamp01(d / duration_s));

  // 3) Dominance
  let domIdx = 0;
  let dom = -Infinity;
  for (let i = 0; i < sharesSeg.length; i++) {
    const p = sharesSeg[i]!;
    if (p > dom) {
      dom = p;
      domIdx = i;
    }
  }
  const dominance_pct = round1(dom * 100);

  // 4) Evenness (Simpson): E = (1 - sum(p_i^2)) / (1 - 1/n)
  const sumSq = sharesSeg.reduce((a, p) => a + p * p, 0);
  const n = sharesSeg.length;
  const simpson = 1 - sumSq;
  const denom = 1 - 1 / n;
  const evenness_0_1 = denom > 0 ? clamp01(simpson / denom) : 0;

  const score_0_100 = clamp100(evenness_0_1 * 100);

  // 5) We keep the old shape for compatibility:
  //    - dominant_section becomes neutral label stored in the existing field (type-cast),
  //      but we must remain type-safe -> keep null and move label into highlights.
  //    - shares_pct stays zeroed (we no longer compute intro/build/etc).
  //    - drop_share_pct becomes 0.
  const highlights: string[] = [];
  highlights.push(`Dominant segment: SEGMENT #${domIdx + 1} (${dominance_pct.toFixed(1)}%).`);
  const coveragePct = round1((covered_s / duration_s) * 100);
  if (unclassified_s / duration_s >= 0.15) {
    highlights.push(`Large unclassified timeline: ${round1((unclassified_s / duration_s) * 100)}% (segments do not cover full track).`);
  } else {
    highlights.push(`Segment coverage: ${coveragePct}%.`);
  }

  return {
    score_0_100,
    dominant_section: null,
    shares_pct: { intro: 0, build: 0, drop: 0, break: 0, outro: 0 },
    features: {
      duration_s,
      covered_s,
      unclassified_s,
      dominance_pct,
      evenness_0_1,
      drop_share_pct: 0,
    },
    highlights,
  };
}

