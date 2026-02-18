import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";

type Section = StructureAnalysisV1["sections"][number];
type RangeSection = Exclude<Section, { type: "drop"; t: number; impact: number; impact_score: number }>;
type DropSection = Extract<Section, { type: "drop"; t: number; impact: number; impact_score: number }>;

const MIN_SECTION_DURATION_S: Record<RangeSection["type"], number> = {
  intro: 6,
  build: 4,
  break: 4,
  outro: 6,
};

// Anti-chatter: if two adjacent range sections start extremely close to each other,
// we merge them deterministically to avoid boundary flapping.
const MIN_SECTION_START_GAP_S = 3;

// Collapse very short middle segments by energy similarity (reduces rapid alternation noise)
const MAX_MIDDLE_SEGMENT_S = 3;

function isDrop(s: Section): s is DropSection {
  return (s as any).type === "drop" && typeof (s as any).t === "number";
}

function isRange(s: Section): s is RangeSection {
  return !isDrop(s);
}

function clampTime(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

function durationOf(r: RangeSection): number {
  return Math.max(0, clampTime(r.end) - clampTime(r.start));
}

function meanEnergyInRange(energy: Array<{ t: number; e: number }>, start: number, end: number): number {
  if (!Array.isArray(energy) || energy.length === 0) return 0;
  const s = clampTime(start);
  const e = clampTime(end);
  if (e <= s) return 0;

  let sum = 0;
  let n = 0;
  for (const p of energy) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.e)) continue;
    if (p.t >= s && p.t <= e) {
      sum += p.e;
      n++;
    }
  }
  // Fallback: nearest point if none fell into window (coarse timeline)
  if (n === 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    const mid = (s + e) / 2;
    for (let i = 0; i < energy.length; i++) {
      const d = Math.abs(energy[i]!.t - mid);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return Number.isFinite(energy[bestIdx]!.e) ? energy[bestIdx]!.e : 0;
  }
  return sum / n;
}

function mergeTwoRanges(a: RangeSection, b: RangeSection): RangeSection {
  const aDur = durationOf(a);
  const bDur = durationOf(b);

  // Keep the type of the longer segment (dominant), but merge time boundaries.
  const dominant = aDur >= bDur ? a : b;
  const start = Math.min(clampTime(a.start), clampTime(b.start));
  const end = Math.max(clampTime(a.end), clampTime(b.end));

  return { type: dominant.type, start, end } as RangeSection;
}

/**
 * Modul 2 (V1): Stabilisiert Section-Ranges (intro/build/break/outro).
 *
 * Was es tut (deterministisch, ohne ML):
 * - Mindestlängen-Regel: zu kurze Sections werden in Nachbar-Sections gemerged
 * - Energy-Continuity Merge: benachbarte Sections mit sehr ähnlicher Energie werden gemerged
 *
 * Was es NICHT tut (kommt später):
 * - Sequenzlogik (intro→build→drop→break …) umschreiben
 * - Hook/Arc/Drop-Confidence
 * - Drop-Events neu klassifizieren (Schema hat Drop als Punkt-Event)
 */
export function stabilizeStructureSectionsV1(params: {
  energy_curve: StructureAnalysisV1["energy_curve"];
  sections: StructureAnalysisV1["sections"];
}): StructureAnalysisV1["sections"] {
  const energy = Array.isArray(params.energy_curve) ? params.energy_curve : [];
  const sectionsIn = Array.isArray(params.sections) ? params.sections : [];

  const drops: DropSection[] = sectionsIn.filter(isDrop);

  // Work only on range sections; normalize + sort by start time
  let ranges: RangeSection[] = sectionsIn
    .filter(isRange)
    .map((s) => {
      const start = clampTime((s as any).start);
      const end = clampTime((s as any).end);
      const type = (s as any).type as RangeSection["type"];
      return { type, start: Math.min(start, end), end: Math.max(start, end) } as RangeSection;
    })
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start);

  ranges.sort((a, b) => a.start - b.start);

  // Pass A: Minimum duration merge
  // Repeat until stable (bounded by list length)
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i]!;
      const minDur = MIN_SECTION_DURATION_S[r.type] ?? 4;
      const dur = durationOf(r);
      if (dur >= minDur) continue;

      const prev = i > 0 ? ranges[i - 1]! : null;
      const next = i < ranges.length - 1 ? ranges[i + 1]! : null;

      // Choose merge target deterministically.
      // Goal: remove mini-sections (especially mini-break dips) without changing core detection logic.
      let mergeIntoPrev = false;

      if (prev && next) {
        const rE = meanEnergyInRange(energy, r.start, r.end);
        const pE = meanEnergyInRange(energy, prev.start, prev.end);
        const nE = meanEnergyInRange(energy, next.start, next.end);

        if (r.type === "break") {
          // Mini-breaks are usually brief dips; merge into the higher-energy neighbor.
          // Tie-break: prefer previous for determinism.
          if (pE === nE) mergeIntoPrev = true;
          else mergeIntoPrev = pE > nE;
        } else if (r.type === "build") {
          // For builds, keep the neighbor that matches energy best.
          // Tie-break: prefer previous for determinism.
          const dP = Math.abs(rE - pE);
          const dN = Math.abs(rE - nE);
          mergeIntoPrev = dP <= dN;
        } else {
          // Default: energy similarity
          const dP = Math.abs(rE - pE);
          const dN = Math.abs(rE - nE);
          mergeIntoPrev = dP <= dN;
        }
      } else if (prev) {
        mergeIntoPrev = true;
      } else if (next) {
        mergeIntoPrev = false;
      } else {
        // only one section total -> keep it (nothing to merge)
        continue;
      }

      if (mergeIntoPrev && prev) {
        const merged = mergeTwoRanges(prev, r);
        ranges[i - 1] = merged;
        ranges.splice(i, 1);
        i = Math.max(-1, i - 2); // rewind a bit
        changed = true;
        break;
      }

      if (!mergeIntoPrev && next) {
        const merged = mergeTwoRanges(r, next);
        ranges[i] = merged;
        ranges.splice(i + 1, 1);
        i = Math.max(-1, i - 1);
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }

  // Pass A2: Minimum start-gap merge (anti-chatter)
  // If two adjacent sections start too close in time, merge them to avoid rapid flips.
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;

    for (let i = 0; i < ranges.length - 1; i++) {
      const a = ranges[i]!;
      const b = ranges[i + 1]!;
      const startGap = clampTime(b.start) - clampTime(a.start);

      if (startGap > 0 && startGap < MIN_SECTION_START_GAP_S) {
        ranges[i] = mergeTwoRanges(a, b);
        ranges.splice(i + 1, 1);
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }

  // Pass A3: Collapse very short middle segments by energy similarity
  // If a short segment sits between two neighbors, merge it into the closer-energy neighbor (tie -> prev).
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;

    for (let i = 1; i < ranges.length - 1; i++) {
      const prev = ranges[i - 1]!;
      const mid = ranges[i]!;
      const next = ranges[i + 1]!;

      if (durationOf(mid) >= MAX_MIDDLE_SEGMENT_S) continue;

      const mE = meanEnergyInRange(energy, mid.start, mid.end);
      const pE = meanEnergyInRange(energy, prev.start, prev.end);
      const nE = meanEnergyInRange(energy, next.start, next.end);

      const dP = Math.abs(mE - pE);
      const dN = Math.abs(mE - nE);

      const mergeIntoPrev = dP <= dN;

      if (mergeIntoPrev) {
        ranges[i - 1] = mergeTwoRanges(prev, mid);
        ranges.splice(i, 1);
      } else {
        ranges[i] = mergeTwoRanges(mid, next);
        ranges.splice(i + 1, 1);
      }

      changed = true;
      break;
    }

    if (!changed) break;
  }

  // Pass B: Energy-continuity merge for adjacent ranges
  // If mean energy is almost same, merge to remove artificial splits.
  // Thresholds are intentionally conservative.
  for (let guard = 0; guard < 50; guard++) {
    let changed = false;

    for (let i = 0; i < ranges.length - 1; i++) {
      const a = ranges[i]!;
      const b = ranges[i + 1]!;
      const aE = meanEnergyInRange(energy, a.start, a.end);
      const bE = meanEnergyInRange(energy, b.start, b.end);

      // Δ mean energy < 0.08 (8%) => merge
      if (Math.abs(aE - bE) < 0.08) {
        ranges[i] = mergeTwoRanges(a, b);
        ranges.splice(i + 1, 1);
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }

  // Pass C: Overlap guard (mathematical consistency)
  // Ensure ranges are sequential and non-overlapping after merges.
  for (let i = 1; i < ranges.length; i++) {
    const prev = ranges[i - 1]!;
    const cur = ranges[i]!;

    if (clampTime(cur.start) < clampTime(prev.end)) {
      const fixedStart = clampTime(prev.end);
      const fixedEnd = Math.max(fixedStart, clampTime(cur.end));

      ranges[i] = { ...cur, start: fixedStart, end: fixedEnd } as RangeSection;
    }
  }

  // Remove any zero-length segments created by the guard
  ranges = ranges.filter((r) => durationOf(r) > 0.001);

  // Re-assemble: keep drops as-is (point events). Sort everything deterministically.
  const out: StructureAnalysisV1["sections"] = [
    ...ranges,
    ...drops,
  ] as any;

  out.sort((a, b) => {
    const ta = isDrop(a) ? a.t : a.start;
    const tb = isDrop(b) ? b.t : b.start;
    return ta - tb;
  });

  return out;
}
