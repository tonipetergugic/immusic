"use client";

import React from "react";

export default function JourneyWaveformWithTooltip(props: {
  series: number[] | null;
  durationS: number | null;
  svgW: number;
  svgH: number;
  children: React.ReactNode;
  lufsTimeline?: Array<{ t: number; lufs: number }> | null;
}) {
  const { series, durationS, svgW, svgH, children, lufsTimeline } = props;

  const [hoverPoint, setHoverPoint] = React.useState<{
    x: number;
    y: number;
    time: number;
    value: number;
    lufs: number | null;
  } | null>(null);

  const tlSorted = React.useMemo(() => {
    if (!lufsTimeline || lufsTimeline.length < 2) return null;
    const tl = lufsTimeline
      .filter((p) => p && Number.isFinite(p.t) && Number.isFinite(p.lufs))
      .slice()
      .sort((a, b) => a.t - b.t);
    return tl.length >= 2 ? tl : null;
  }, [lufsTimeline]);

  const rafRef = React.useRef<number | null>(null);
  const nextHoverRef = React.useRef<{
    x: number;
    y: number;
    time: number;
    value: number;
    lufs: number | null;
  } | null>(null);

  React.useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="h-full w-full"
        onMouseMove={(e) => {
          if (!series || !durationS) return;

          // Always measure relative to the SVG element itself (not child rect/polyline)
          const svgEl = e.currentTarget as SVGSVGElement;
          const rect = svgEl.getBoundingClientRect();

          const relX = e.clientX - rect.left;
          const pctRaw = relX / rect.width;

          // clamp 0..1
          const pct = Math.max(0, Math.min(1, pctRaw));

          // snap to a coarse grid to avoid jitter (feels like pro tools)
          const SNAP_POINTS = 240;
          const snapped = Math.round(pct * (SNAP_POINTS - 1)) / (SNAP_POINTS - 1);

          const idx = Math.round(snapped * (series.length - 1));
          if (idx < 0 || idx >= series.length) return;

          const val = series[idx] ?? 0;
          const time = snapped * durationS;

          // LUFS lookup (linear interpolation on memoized timeline)
          const lufsNow = (() => {
            if (!tlSorted) return null;

            const tl = tlSorted;

            const t = Math.max(tl[0]!.t, Math.min(tl[tl.length - 1]!.t, time));

            let j = 0;
            while (j < tl.length - 2 && tl[j + 1]!.t < t) j++;

            const a = tl[j]!;
            const b = tl[Math.min(tl.length - 1, j + 1)]!;

            if (b.t <= a.t) return a.lufs;

            const alpha = (t - a.t) / (b.t - a.t);
            return a.lufs + (b.lufs - a.lufs) * alpha;
          })();

          const next = {
            x: snapped * rect.width,
            y: 0,
            time,
            value: val,
            lufs: lufsNow,
          };

          const prevSnap =
            hoverPoint && durationS
              ? Math.round((hoverPoint.time / durationS) * (SNAP_POINTS - 1))
              : null;

          const nextSnap = Math.round(snapped * (SNAP_POINTS - 1));

          if (prevSnap !== null && prevSnap === nextSnap) return;

          nextHoverRef.current = next;

          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(() => {
              rafRef.current = null;
              if (nextHoverRef.current) setHoverPoint(nextHoverRef.current);
            });
          }
        }}
        onMouseLeave={() => {
          nextHoverRef.current = null;
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          setHoverPoint(null);
        }}
      >
        {children}
      </svg>
      {hoverPoint ? (
        <div
          className="pointer-events-none absolute top-0 h-full w-px"
          style={{
            left: `clamp(0px, ${hoverPoint.x}px, 100%)`,
            background: "rgba(255,255,255,0.55)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.35), 0 0 16px rgba(255,255,255,0.12)",
          }}
        />
      ) : null}
      {hoverPoint && (() => {
        // Artist-first interpretation (no numbers)
        const v = Math.max(0, Math.min(1, hoverPoint.value ?? 0));

        const level =
          v >= 0.78 ? "High energy" :
          v >= 0.48 ? "Medium energy" :
          "Low energy";

        // Momentum: compare to previous snapped point
        const SNAP_POINTS = 240;
        const snappedIdx = durationS && series
          ? Math.round((hoverPoint.time / durationS) * (SNAP_POINTS - 1))
          : null;

        let momentum: "Rising" | "Falling" | "Stable" = "Stable";
        if (series && durationS && snappedIdx !== null) {
          const idx = Math.round((snappedIdx / (SNAP_POINTS - 1)) * (series.length - 1));
          const prevIdx = Math.max(0, idx - 1);
          const prev = series[prevIdx] ?? v;
          const delta = v - prev;

          if (delta > 0.03) momentum = "Rising";
          else if (delta < -0.03) momentum = "Falling";
          else momentum = "Stable";
        }

        const hint =
          level === "High energy" && momentum === "Rising" ? "Strong lift — intensity is building." :
          level === "High energy" && momentum === "Stable" ? "Sustained intensity — feels steady here." :
          level === "High energy" && momentum === "Falling" ? "Energy starts to release — watch the transition." :
          level === "Low energy" && momentum === "Falling" ? "Noticeable dip — may feel empty if unintended." :
          level === "Low energy" && momentum === "Rising" ? "Energy returns — good setup moment." :
          "Natural movement — keep flow consistent.";

        return (
          <div
            className="pointer-events-none absolute rounded-xl border border-white/10 bg-black/85 px-3.5 py-2.5 text-xs text-white shadow-lg"
            style={{
              left: `clamp(14px, ${hoverPoint.x}px, calc(100% - 14px))`,
              bottom: 12,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="tabular-nums text-white/80">
                {Math.floor(hoverPoint.time / 60)}:{String(Math.floor(hoverPoint.time % 60)).padStart(2, "0")}
              </div>
              <div className="text-[11px] text-white/55">{momentum}</div>
            </div>

            <div className="mt-1 text-sm font-semibold text-white/90">
              {level}
            </div>

            <div className="text-white/60">
              Energy: {Math.round(v * 100)}%
            </div>
            <div className="text-white/60">
              Short-term: {hoverPoint.lufs === null ? "—" : `${hoverPoint.lufs.toFixed(1)} LUFS`}
            </div>

            <div className="mt-1 text-[11px] leading-snug text-white/55 max-w-[200px]">
              {hint}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
