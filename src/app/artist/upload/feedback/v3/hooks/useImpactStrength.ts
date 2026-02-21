export type UseImpactStrengthParams = {
  before: number[] | null;
  after: number[] | null;
  impact01: number;
  clamp01: (x: number) => number;
  shapeWaveAmp: (a: number) => number;
};

export function useImpactStrength({ before, after, impact01, clamp01, shapeWaveAmp }: UseImpactStrengthParams) {
  const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / Math.max(1e-9, b - a));
    return t * t * (3 - 2 * t);
  };

  const getSharedMinMax = (a: number[] | null, b: number[] | null) => {
    const xs: number[] = [];
    if (Array.isArray(a)) for (const v of a) if (Number.isFinite(v)) xs.push(v);
    if (Array.isArray(b)) for (const v of b) if (Number.isFinite(v)) xs.push(v);

    if (xs.length < 2) return { ok: false as const, mn: 0, mx: 1 };

    let mn = Infinity;
    let mx = -Infinity;
    for (const v of xs) {
      mn = Math.min(mn, v);
      mx = Math.max(mx, v);
    }

    const span = mx - mn;
    if (!Number.isFinite(mn) || !Number.isFinite(mx) || span < 1e-9) return { ok: false as const, mn: 0, mx: 1 };
    return { ok: true as const, mn, mx };
  };

  const normalizeShared01 = (arr: number[] | null, shared: { ok: boolean; mn: number; mx: number }) => {
    if (!arr || arr.length < 2) return null;

    // If shared is not valid, keep a subtle but stable "alive" baseline.
    if (!shared.ok) return arr.map(() => 0.22);

    const span = shared.mx - shared.mn;
    return arr.map((v) => {
      const x = Number.isFinite(v) ? v : shared.mn;
      return clamp01((x - shared.mn) / Math.max(1e-9, span));
    });
  };

  const shapeSeries = (arr: number[] | null, mode: "before" | "after") => {
    const shared = getSharedMinMax(before, after);
    const norm = normalizeShared01(arr, shared);
    if (!norm) return null;

    // reveal micro-dynamics
    let out = norm.map((v) => shapeWaveAmp(v));

    // impact-driven amplitude (keeps BEFORE calmer, HIGH POINT more present)
    if (impact01 !== null) {
      const t = smoothstep(0.25, 0.85, impact01);

      if (mode === "before") {
        const beforeScale = 0.58 + 0.08 * t; // ~0.58..0.66
        out = out.map((v) => clamp01(v * beforeScale));
      } else {
        let afterScale = 1.0;

        if (impact01 !== null) {
          if (impact01 >= 0.70) {
            afterScale = 1.6;
          } else if (impact01 >= 0.50) {
            afterScale = 1.35;
          } else if (impact01 >= 0.30) {
            afterScale = 1.15;
          } else {
            afterScale = 1.0;
          }
        }

        out = out.map((v) => clamp01(v * afterScale));
      }
    }

    if (mode === "after" && impact01 !== null && impact01 >= 0.70) {
      out = out.map((v) => (v >= 0.72 ? clamp01(v * 1.10) : v));
    }

    return out;
  };

  const before01 = shapeSeries(before, "before");
  const after01 = shapeSeries(after, "after");

  return { before01, after01 };
}
