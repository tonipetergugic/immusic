"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FitRange = { minPx: number; maxPx: number; stepPx?: number };

type FitTextOptions = {
  rangesByMinViewportPx: Record<number, FitRange>;
};

function pickRange(width: number, ranges: Record<number, FitRange>): FitRange {
  const keys = Object.keys(ranges)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  let chosen = keys[0] ?? 0;
  for (const k of keys) {
    if (k <= width) chosen = k;
  }
  return ranges[chosen] ?? { minPx: 28, maxPx: 34, stepPx: 2 };
}

export function useFitText<T extends HTMLElement>(text: string, opts: FitTextOptions) {
  const containerRef = useRef<T | null>(null);
  const [fontPx, setFontPx] = useState<number>(0);

  const cfg = useMemo(() => opts, [opts]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const fit = () => {
      const width = window.innerWidth;
      const range = pickRange(width, cfg.rangesByMinViewportPx);
      const step = range.stepPx ?? 2;

      let size = range.maxPx;
      el.style.fontSize = `${size}px`;

      // force reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetWidth;

      const fits = () => el.scrollWidth <= el.clientWidth;

      while (!fits() && size > range.minPx) {
        size -= step;
        el.style.fontSize = `${size}px`;
      }

      setFontPx(size);
    };

    fit();

    const ro = new ResizeObserver(() => fit());
    ro.observe(el);

    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [text, cfg]);

  return { ref: containerRef, fontPx };
}

