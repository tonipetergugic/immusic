import type { DynamicsHealthLabelV1 } from "@/lib/ai/payload/v2/types";
import { clamp01, clamp100 } from "@/lib/ai/payload/v2/utils";

export function computeDynamicsHealthV1(input: {
  lufs: number | null | undefined;
  lra: number | null | undefined;
  crest: number | null | undefined;

  meanShortCrestDb?: number | null | undefined;
  p95ShortCrestDb?: number | null | undefined;
  transientDensity?: number | null | undefined;
  punchIndex?: number | null | undefined;

  truePeakOversCount?: number | null | undefined;
}): {
  score: number;
  label: DynamicsHealthLabelV1;
  factors: { lufs: number | null; lra: number | null; crest: number | null };
} {
  const lufs = typeof input.lufs === "number" && Number.isFinite(input.lufs) ? input.lufs : null;
  const lra = typeof input.lra === "number" && Number.isFinite(input.lra) ? input.lra : null;
  const crest = typeof input.crest === "number" && Number.isFinite(input.crest) ? input.crest : null;

  const meanShortCrest =
    typeof input.meanShortCrestDb === "number" && Number.isFinite(input.meanShortCrestDb)
      ? input.meanShortCrestDb
      : null;

  const p95ShortCrest =
    typeof input.p95ShortCrestDb === "number" && Number.isFinite(input.p95ShortCrestDb)
      ? input.p95ShortCrestDb
      : null;

  const transientDensity =
    typeof input.transientDensity === "number" && Number.isFinite(input.transientDensity)
      ? input.transientDensity
      : null;

  const punchIndex =
    typeof input.punchIndex === "number" && Number.isFinite(input.punchIndex)
      ? input.punchIndex
      : null;

  const truePeakOversCount =
    typeof input.truePeakOversCount === "number" && Number.isFinite(input.truePeakOversCount)
      ? input.truePeakOversCount
      : null;

  // v2 Philosophie:
  // - Macro Dynamics: Crest + LRA (klassisch)
  // - Micro Dynamics: Short-Term Crest (mean/p95)
  // - Transients/Punch: punchIndex + transientDensity (technisch, nicht "Vibe")
  // - LUFS bleibt Kontext (keine Loudness-Polizei)
  // - TruePeakOvers (Source) ist Hinweis auf hartes Limiting/Clipping -> leichte Penalty/Override

  const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

  const scoreFromRanges = (x: number, ranges: Array<[number, number, number, number]>): number => {
    for (const [x0, x1, y0, y1] of ranges) {
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0);
        return clamp100(lerp(y0, y1, t));
      }
    }
    const first = ranges[0];
    const last = ranges[ranges.length - 1];
    if (x < first[0]) return clamp100(first[2]);
    return clamp100(last[3]);
  };

  // 1) Macro: CrestScore (0–100) – Hauptindikator
  const crestScore =
    crest === null
      ? null
      : scoreFromRanges(crest, [
          [4.5, 5.5, 45, 70],
          [5.5, 7.0, 70, 85],
          [7.0, 8.5, 85, 100],
          [8.5, 20.0, 100, 100],
        ]);

  // 2) Macro: LRAScore (0–100)
  const lraScore =
    lra === null
      ? null
      : scoreFromRanges(lra, [
          [2.0, 3.0, 30, 60],
          [3.0, 5.0, 65, 80],
          [5.0, 8.0, 80, 100],
          [8.0, 30.0, 100, 100],
        ]);

  // 3) Kontext: LUFSScore (0–100) – weich
  const lufsScore =
    lufs === null
      ? null
      : (() => {
          if (lufs <= -12) return 100;
          if (lufs <= -8) {
            const t = (lufs - (-12)) / ((-8) - (-12));
            return clamp100(lerp(100, 90, t));
          }
          if (lufs <= -6) {
            const t = (lufs - (-8)) / ((-6) - (-8));
            return clamp100(lerp(90, 75, t));
          }
          const t = clamp01((lufs - (-6)) / ((-3) - (-6)));
          return clamp100(lerp(75, 60, t));
        })();

  // 4) Micro: Short-Term Crest Score (0–100)
  // p95 ist wichtiger als mean (Peak-Transients)
  const p95ShortCrestScore =
    p95ShortCrest === null
      ? null
      : scoreFromRanges(p95ShortCrest, [
          [4.8, 5.6, 35, 60],
          [5.6, 6.8, 60, 80],
          [6.8, 8.0, 80, 95],
          [8.0, 20.0, 95, 100],
        ]);

  const meanShortCrestScore =
    meanShortCrest === null
      ? null
      : scoreFromRanges(meanShortCrest, [
          [4.5, 5.4, 35, 60],
          [5.4, 6.4, 60, 80],
          [6.4, 7.4, 80, 95],
          [7.4, 20.0, 95, 100],
        ]);

  const shortCrestScore =
    p95ShortCrestScore === null && meanShortCrestScore === null
      ? null
      : (() => {
          const a = p95ShortCrestScore;
          const b = meanShortCrestScore;
          if (a !== null && b !== null) return Math.round(0.65 * a + 0.35 * b);
          return (a ?? b) as number;
        })();

  // 5) Transients / Punch score (0–100)
  const punchScore =
    punchIndex === null && transientDensity === null
      ? null
      : (() => {
          // punchIndex ~ [0..1+] (engine-spezifisch). Kalibrierung bewusst weich.
          const p =
            punchIndex === null
              ? null
              : scoreFromRanges(punchIndex, [
                  [0.10, 0.22, 35, 60],
                  [0.22, 0.40, 60, 85],
                  [0.40, 0.70, 85, 100],
                  [0.70, 2.00, 100, 100],
                ]);

          // transientDensity ~ Anteil transienter Frames, weich gewichtet
          const d =
            transientDensity === null
              ? null
              : scoreFromRanges(transientDensity, [
                  [0.02, 0.05, 35, 60],
                  [0.05, 0.10, 60, 85],
                  [0.10, 0.18, 85, 100],
                  [0.18, 1.00, 100, 100],
                ]);

          if (p !== null && d !== null) return Math.round(0.70 * p + 0.30 * d);
          return (p ?? d) as number;
        })();

  // Overs Penalty (Source True Peak Overs): leicht, aber relevant als technischer Hinweis
  let oversPenalty = 0;
  if (typeof truePeakOversCount === "number" && truePeakOversCount > 0) {
    // 1–2 overs: minimal; 3–8: spürbar; >8: stärker
    if (truePeakOversCount <= 2) oversPenalty = 3;
    else if (truePeakOversCount <= 8) oversPenalty = 8;
    else oversPenalty = 14;
  }

  // Gewichte v2:
  // - Crest 28%, LRA 20% (Macro)
  // - Short-term crest 26% (Micro)
  // - Punch 16%
  // - LUFS 10% (Kontext)
  const parts: Array<{ w: number; v: number | null }> = [
    { w: 0.24, v: crestScore },
    { w: 0.28, v: lraScore },
    { w: 0.24, v: shortCrestScore },
    { w: 0.16, v: punchScore },
    { w: 0.08, v: lufsScore },
  ];

  const available = parts.filter((p) => typeof p.v === "number");
  let score: number;

  if (available.length === 0) {
    score = 65; // neutral
  } else {
    const wSum = available.reduce((a, p) => a + p.w, 0);
    const vSum = available.reduce((a, p) => a + p.w * (p.v as number), 0);
    score = Math.round(vSum / wSum);
  }

  score = clamp100(score - oversPenalty);

  // --- LRA Hard Caps (technisch, nicht geschmacksbasiert) ---
  // Sehr niedrige LRA = extrem limitiert/komprimiert -> darf nicht als "healthy" durchgehen.
  if (lra !== null) {
    // Cap score bei sehr niedriger LRA
    if (lra < 1.2) {
      if (score > 64) score = 64;
    } else if (lra < 1.5) {
      if (score > 72) score = 72;
    }

    // Wenn LRA < 2.0: "healthy" ist grundsätzlich nicht erlaubt
    // (Label-Cap wird weiter unten nach der Label-Berechnung angewendet)
  }

  // Labeling: Healthy ab 78 (etwas strenger als v1, weil wir mehr Signale haben)
  let label: DynamicsHealthLabelV1 =
    score >= 78 ? "healthy" : score >= 58 ? "borderline" : "over-limited";

  // LRA Label Cap: bei LRA < 2.0 niemals "healthy"
  if (lra !== null && lra < 2.0 && label === "healthy") {
    label = "borderline";
  }

  // Over-limited Override (technisch):
  // Wenn Macro + Micro extrem flach sind, unabhängig vom Score -> over-limited.
  const condMacroFlat = crest !== null && crest < 4.5;
  const condMicroFlat =
    (p95ShortCrest !== null && p95ShortCrest < 5.0) || (meanShortCrest !== null && meanShortCrest < 4.8);
  const condLraFlat = lra !== null && lra < 2.0;

  const condCount = Number(condMacroFlat) + Number(condMicroFlat) + Number(condLraFlat);

  if (condCount >= 2) {
    label = "over-limited";
    if (score > 54) score = 54;
  }

  // Spezial: extrem flache Makrodynamik soll nie "healthy" sein
  if (lra !== null && lra < 1.0) {
    if (score > 77) score = 77;
    if (label === "healthy") label = "borderline";
  }

  // Spezial: Micro extrem flach (p95 < 4.6) -> deckeln
  if (p95ShortCrest !== null && p95ShortCrest < 4.6) {
    if (score > 64) score = 64;
    if (label === "healthy") label = "borderline";
  }

  return {
    score: clamp100(score),
    label,
    factors: { lufs, lra, crest },
  };
}
