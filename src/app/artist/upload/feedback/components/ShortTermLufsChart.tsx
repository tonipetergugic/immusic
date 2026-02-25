"use client";

import { useRef, useState } from "react";

type Point = { t: number; lufs: number };

function computeStats(data: Point[]) {
  if (!data.length) return null;

  const FLOOR = -28;

  const values = data
    .map(d => d.lufs)
    .filter(v => Number.isFinite(v) && v >= FLOOR);

  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);

  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const percentile = (p: number) => {
    if (sorted.length === 1) return sorted[0];
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const t = idx - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  };

  const p05 = percentile(0.05);
  const p95 = percentile(0.95);

  // Robust dynamics range for labeling (resistant to outliers)
  const rangeRobust = p95 - p05;

  // Keep legacy range too (min/max), but don't use it for labels anymore
  const range = max - min;

  return { min, max, range, p05, p95, rangeRobust };
}

function getRangeLabel(range: number): string {
  if (range < 3) return "Very Flat";
  if (range < 6) return "Slight Movement";
  if (range < 9) return "Natural Movement";
  if (range < 13) return "Strong Movement";
  return "Very Wide Movement";
}

export default function ShortTermLufsChart({
  timeline,
  integratedLufs,
}: {
  timeline: Point[] | null;
  integratedLufs: number | null;
}) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (!timeline?.length) {
    return (
      <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-black/30 p-5 text-center">
        <div className="text-sm text-white/40 font-medium tracking-tight">
          No short-term LUFS data available
        </div>
      </div>
    );
  }

  const stats = computeStats(timeline);
  if (!stats) return null;

  const { min, max, rangeRobust } = stats;
  const dynDb = rangeRobust;
  const dynLabel = getRangeLabel(dynDb);
  const VISUAL_TOP = 0;      // always 0 LUFS
  const VISUAL_BOTTOM = min; // still use clipped min (-28 floor)
  const n = timeline.length;
  const denom = Math.max(1, n - 1);

  const points = timeline.map((p, i) => {
    const x = (i / denom) * 100;

    const norm = (p.lufs - VISUAL_BOTTOM) / (VISUAL_TOP - VISUAL_BOTTOM || 1);
    const y = 100 - norm * 100;
    return { x, y, lufs: p.lufs, t: p.t };
  });

  // Rendering: avoid "flat line at bottom" caused by SVG clipping when many points are below y=100.
  // We render up to the last visible point (y <= 100) plus ONE extra point to show the drop.
  const renderPoints = (() => {
    let lastVisible = -1;
    for (let i = 0; i < points.length; i++) {
      if (points[i].y <= 100) lastVisible = i;
    }

    if (lastVisible === -1) return points.slice(0, 1);
    if (lastVisible >= points.length - 1) return points;

    return points.slice(0, lastVisible + 2);
  })();

  const linePoints = renderPoints.map(p => `${p.x},${p.y}`).join(" ");
  const last = renderPoints[renderPoints.length - 1];

const areaPath = `
  M 0,100
  L ${renderPoints.map(p => `${p.x},${p.y}`).join(" L ")}
  L ${last.x},100
  Z
`.trim();

  const avgY =
    typeof integratedLufs === "number" &&
    Number.isFinite(integratedLufs) &&
    max > min
      ? 100 - ((integratedLufs - VISUAL_BOTTOM) / (VISUAL_TOP - VISUAL_BOTTOM)) * 100
      : null;

  return (
    <div className="rounded-3xl border border-white/9 bg-black/30 p-6 md:p-8 shadow-xl shadow-black/40">
      <div className="mb-4">
        <div className="text-lg font-semibold text-white">
          Dynamic Movement: {dynDb.toFixed(1)} dB
        </div>

        <div className="mt-1 text-sm text-white/60">
          {dynLabel === "Very Flat" && "Your track stays almost the same loudness throughout."}
          {dynLabel === "Slight Movement" && "There are small loudness differences between sections."}
          {dynLabel === "Natural Movement" && "Your track has natural loudness changes between sections."}
          {dynLabel === "Strong Movement" && "There is a strong contrast between quiet and loud sections."}
          {dynLabel === "Very Wide Movement" && "Your track moves from very quiet to very loud moments."}
        </div>
      </div>
      <div className="relative h-56 md:h-64 w-full">
        <div className="absolute inset-0 rounded-2xl border border-white/7 bg-black/40 overflow-hidden">
          <div
            ref={wrapperRef}
            className="absolute inset-0 cursor-crosshair"
            onMouseMove={e => {
              if (!wrapperRef.current) return;
              const rect = wrapperRef.current.getBoundingClientRect();
              const xPx = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, xPx / rect.width));
              const i = Math.round(ratio * (n - 1));

              if (i >= 0 && i < n) {
                const pt = points[i];
                const VIEW_MIN_Y = -5;
                const VIEW_H = 110;
                const yPx = ((pt.y - VIEW_MIN_Y) / VIEW_H) * rect.height;
                setHover({ i, x: xPx, y: yPx });
              }
            }}
            onMouseLeave={() => setHover(null)}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 -5 100 110"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="lufsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0,255,198,0.28)" />
                  <stop offset="70%" stopColor="rgba(0,255,198,0.10)" />
                  <stop offset="100%" stopColor="rgba(0,255,198,0.02)" />
                </linearGradient>
                <linearGradient id="lufsLine" x1="0" y1="0" x2="100%" y2="0">
                  <stop offset="0%" stopColor="#00FFC6" />
                  <stop offset="100%" stopColor="#00E0B0" />
                </linearGradient>
              </defs>

              <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.5">
                <line x1="0" x2="100" y1="25" y2="25" />
                <line x1="0" x2="100" y1="50" y2="50" />
                <line x1="0" x2="100" y1="75" y2="75" />
              </g>

              <path d={areaPath} fill="url(#lufsArea)" />

              <polyline
                points={linePoints}
                fill="none"
                stroke="url(#lufsLine)"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {avgY !== null && (
                <line
                  x1="0"
                  x2="100"
                  y1={avgY}
                  y2={avgY}
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth="1.1"
                  strokeDasharray="5 3"
                />
              )}

              {hover && (
                <>
                  <line
                    x1={points[hover.i].x}
                    x2={points[hover.i].x}
                    y1="0"
                    y2="105"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.6"
                  />
                </>
              )}
            </svg>

            <div className="pointer-events-none absolute left-3 top-3 text-[10px] font-medium tabular-nums text-white/50">
              0 LUFS
            </div>
            {typeof integratedLufs === "number" && Number.isFinite(integratedLufs) && (
              <div className="pointer-events-none absolute right-3 top-3 text-[10px] font-medium tabular-nums text-white/60">
                Integrated: {integratedLufs.toFixed(1)} LUFS
              </div>
            )}
            <div className="pointer-events-none absolute left-3 bottom-3 text-[10px] font-medium tabular-nums text-white/50">
              {min.toFixed(1)} LUFS
            </div>

            {hover && (() => {
              const pt = points[hover.i];
              const m = Math.floor(pt.t / 60);
              const s = (pt.t % 60).toFixed(0).padStart(2, "0");
              const tooltipWidth = 120;
              const x = Math.max(
                8,
                Math.min(
                  hover.x,
                  wrapperRef.current!.clientWidth - tooltipWidth - 8
                )
              );

              return (
                <div
                  className="pointer-events-none absolute z-20 rounded-lg bg-black/85 border border-white/10 px-3 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-md"
                  style={{
                    left: x,
                    top: Math.max(
                      8,
                      Math.min(
                        hover.y - 52,
                        wrapperRef.current!.clientHeight - 64
                      )
                    ),
                  }}
                >
                  <div className="tabular-nums tracking-tight">
                    {m}:{s} <span className="text-white/60">•</span>{" "}
                    {pt.lufs.toFixed(1)} LUFS
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}