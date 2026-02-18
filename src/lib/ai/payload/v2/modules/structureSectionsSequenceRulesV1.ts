import type { StructureAnalysisV1 } from "@/lib/ai/payload/v2/types";

type Section = StructureAnalysisV1["sections"][number];
type RangeSection = Exclude<Section, { type: "drop"; t: number; impact: number; impact_score: number }>;
type DropSection = Extract<Section, { type: "drop"; t: number; impact: number; impact_score: number }>;

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

  if (n === 0) {
    // fallback nearest energy point around mid
    const mid = (s + e) / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
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

function mergeRanges(a: RangeSection, b: RangeSection): RangeSection {
  const start = Math.min(clampTime(a.start), clampTime(b.start));
  const end = Math.max(clampTime(a.end), clampTime(b.end));
  // keep first type (stable + deterministic)
  return { type: a.type, start, end } as RangeSection;
}

/**
 * Modul 2.1 (V1): Sequenz-Regeln (konservativ).
 *
 * Ziel:
 * - Offensichtlich unlogische Positionen für intro/outro korrigieren
 * - Keine „Geschmacks"-Interpretation, nur robuste Standardlogik
 *
 * Regeln (konservativ):
 * - intro darf nur am Anfang stehen (sonst wird es zu break/build je nach mittlerer Energie)
 * - outro darf nur am Ende stehen (sonst wird es zu break/build je nach mittlerer Energie)
 * - optional: erster Abschnitt kann intro werden, wenn sehr niedrig
 * - optional: letzter Abschnitt kann outro werden, wenn sehr niedrig + lang genug
 * - anschließend: gleiche Nachbar-Typen werden zusammengeführt (nur Ranges)
 *
 * Drop-Events bleiben unberührt.
 */
export function applyStructureSequenceRulesV1(params: {
  energy_curve: StructureAnalysisV1["energy_curve"];
  sections: StructureAnalysisV1["sections"];
}): StructureAnalysisV1["sections"] {
  const energy = Array.isArray(params.energy_curve) ? params.energy_curve : [];
  const sectionsIn = Array.isArray(params.sections) ? params.sections : [];

  const drops: DropSection[] = sectionsIn.filter(isDrop);

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

  if (ranges.length === 0) {
    const outEmpty: StructureAnalysisV1["sections"] = [...drops] as any;
    outEmpty.sort((a, b) => (isDrop(a) ? a.t : a.start) - (isDrop(b) ? b.t : b.start));
    return outEmpty;
  }

  // Helpers for conservative relabel
  const relabelIntroOrOutro = (r: RangeSection): RangeSection => {
    const mE = meanEnergyInRange(energy, r.start, r.end);
    // low energy -> break, otherwise build
    const newType: RangeSection["type"] = mE < 0.45 ? "break" : "build";
    return { ...r, type: newType };
  };

  // Rule A: intro only at start
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i]!.type === "intro" && i !== 0) {
      ranges[i] = relabelIntroOrOutro(ranges[i]!);
    }
  }

  // Rule B: outro only at end
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i]!.type === "outro" && i !== ranges.length - 1) {
      ranges[i] = relabelIntroOrOutro(ranges[i]!);
    }
  }

  // Rule C (optional, conservative): first section can be intro if very low energy
  {
    const first = ranges[0]!;
    const mE = meanEnergyInRange(energy, first.start, first.end);
    if (first.type !== "intro" && mE < 0.35) {
      ranges[0] = { ...first, type: "intro" };
    }
  }

  // Rule D (optional, conservative): last section can be outro if very low energy + long enough
  {
    const lastIdx = ranges.length - 1;
    const last = ranges[lastIdx]!;
    const mE = meanEnergyInRange(energy, last.start, last.end);
    if (last.type !== "outro" && mE < 0.35 && durationOf(last) >= 6) {
      ranges[lastIdx] = { ...last, type: "outro" };
    }
  }

  // Rule F (conservative): "build" must not start after the first drop.
  // If a build starts after we already observed a drop, relabel it by energy:
  // - low energy -> break
  // - otherwise -> build (kept) (but this case is rare; still conservative)
  {
    const dropTimes = drops.map((d) => d.t).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    const firstDropT = dropTimes.length > 0 ? dropTimes[0]! : null;

    if (firstDropT != null) {
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i]!;
        if (r.type !== "build") continue;

        // If the build starts strictly after the first drop event, it's likely a mislabel.
        if (r.start > firstDropT) {
          const mE = meanEnergyInRange(energy, r.start, r.end);
          const newType: RangeSection["type"] = mE < 0.45 ? "break" : "build";
          ranges[i] = { ...r, type: newType };
        }
      }
    }
  }

  // Rule E: merge adjacent ranges with same type (stable)
  for (let i = 0; i < ranges.length - 1; i++) {
    const a = ranges[i]!;
    const b = ranges[i + 1]!;
    if (a.type === b.type) {
      ranges[i] = mergeRanges(a, b);
      ranges.splice(i + 1, 1);
      i = Math.max(-1, i - 1);
    }
  }

  // Re-assemble & deterministic sort
  const out: StructureAnalysisV1["sections"] = [...ranges, ...drops] as any;
  out.sort((a, b) => {
    const ta = isDrop(a) ? a.t : a.start;
    const tb = isDrop(b) ? b.t : b.start;
    return ta - tb;
  });

  return out;
}
