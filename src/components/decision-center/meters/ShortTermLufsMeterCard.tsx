"use client";

import { useMemo, useRef, useState } from "react";

type ShortTermLufsPoint = {
  t: number;
  lufs: number;
};

type ShortTermLufsMeterCardProps = {
  integratedLufs: number | null;
  dynamicRangeLu: number | null;
  points: ShortTermLufsPoint[];
};

type ChartPoint = ShortTermLufsPoint & {
  x: number;
  y: number;
};

const VISUAL_TOP = -6;
const VISUAL_BOTTOM = -28;

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (!isValidNumber(value)) {
    return "—";
  }

  return value.toFixed(digits);
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;

  return `${minutes}:${String(restSeconds).padStart(2, "0")}`;
}

function getDynamicMovementLabel(dynamicRangeLu: number | null) {
  if (!isValidNumber(dynamicRangeLu)) {
    return "UNKNOWN";
  }

  if (dynamicRangeLu < 3) {
    return "VERY FLAT";
  }

  if (dynamicRangeLu < 5) {
    return "SLIGHT MOVEMENT";
  }

  if (dynamicRangeLu < 8) {
    return "NATURAL MOVEMENT";
  }

  if (dynamicRangeLu < 11) {
    return "STRONG MOVEMENT";
  }

  return "VERY WIDE MOVEMENT";
}

function getDynamicMovementText(label: string) {
  if (label === "VERY FLAT") {
    return "The track stays almost the same loudness throughout.";
  }

  if (label === "SLIGHT MOVEMENT") {
    return "There are small loudness differences between sections.";
  }

  if (label === "NATURAL MOVEMENT") {
    return "The track has natural loudness changes between sections.";
  }

  if (label === "STRONG MOVEMENT") {
    return "There is a strong contrast between quieter and louder moments.";
  }

  if (label === "VERY WIDE MOVEMENT") {
    return "The track moves between very quiet and very loud moments.";
  }

  return "Short-term loudness movement is not available yet.";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildChartPoints(points: ShortTermLufsPoint[]): ChartPoint[] {
  const validPoints = points.filter(
    (point) => Number.isFinite(point.t) && Number.isFinite(point.lufs),
  );

  if (validPoints.length === 0) {
    return [];
  }

  const minTime = validPoints[0]?.t ?? 0;
  const maxTime = validPoints[validPoints.length - 1]?.t ?? minTime;
  const timeRange = Math.max(maxTime - minTime, 1);

  return validPoints.map((point) => {
    const x = ((point.t - minTime) / timeRange) * 100;
    const clippedLufs = clamp(point.lufs, VISUAL_BOTTOM, VISUAL_TOP);
    const y =
      100 -
      ((clippedLufs - VISUAL_BOTTOM) / (VISUAL_TOP - VISUAL_BOTTOM)) * 100;

    return {
      ...point,
      x,
      y,
    };
  });
}

export function ShortTermLufsMeterCard({
  integratedLufs,
  dynamicRangeLu,
  points,
}: ShortTermLufsMeterCardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartPoints = useMemo(() => buildChartPoints(points), [points]);
  const hasChart = chartPoints.length > 1;
  const label = getDynamicMovementLabel(dynamicRangeLu);
  const hoverPoint =
    hoverIndex !== null && chartPoints[hoverIndex]
      ? chartPoints[hoverIndex]
      : null;

  const linePath = hasChart
    ? chartPoints.map((point) => `${point.x},${point.y}`).join(" L ")
    : "";

  const areaPath = hasChart
    ? `
M ${chartPoints[0].x},100
L ${linePath}
L ${chartPoints[chartPoints.length - 1].x},100
Z
`.trim()
    : "";

  const integratedY =
    isValidNumber(integratedLufs) && hasChart
      ? 100 -
        ((clamp(integratedLufs, VISUAL_BOTTOM, VISUAL_TOP) - VISUAL_BOTTOM) /
          (VISUAL_TOP - VISUAL_BOTTOM)) *
          100
      : null;

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl shadow-black/30 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.22em] text-white/40">
            Loudness movement
          </div>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Short-Term LUFS
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Shows how loudness moves over the track instead of only showing one
            integrated loudness value.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          {hasChart ? label : "NOT AVAILABLE"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-wider text-white/35">
            Integrated LUFS
          </div>
          <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {formatNumber(integratedLufs)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-wider text-white/35">
            Dynamic movement
          </div>
          <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {formatNumber(dynamicRangeLu)} LU
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-wider text-white/35">
            Measurement points
          </div>
          <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {hasChart ? chartPoints.length : "—"}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white">
              Dynamic Movement: {formatNumber(dynamicRangeLu)} LU
            </div>
            <div className="mt-1 text-sm text-white/45">
              {getDynamicMovementText(label)}
            </div>
          </div>

          <div className="text-xs uppercase tracking-wider text-white/35">
            3s window / 1s hop
          </div>
        </div>

        {hasChart ? (
          <div
            ref={wrapperRef}
            className="relative h-56 overflow-hidden rounded-2xl border border-white/10 bg-black/40"
            onMouseLeave={() => setHoverIndex(null)}
            onMouseMove={(event) => {
              const rect = wrapperRef.current?.getBoundingClientRect();

              if (!rect) {
                return;
              }

              const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
              const nextIndex = Math.round(x * (chartPoints.length - 1));

              setHoverIndex(nextIndex);
            }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="shortTermLufsArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,211,238,0.32)" />
                  <stop offset="100%" stopColor="rgba(34,211,238,0.02)" />
                </linearGradient>
              </defs>

              <path d={areaPath} fill="url(#shortTermLufsArea)" />
              <polyline
                fill="none"
                points={linePath}
                stroke="rgba(34,211,238,0.95)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                vectorEffect="non-scaling-stroke"
              />

              {integratedY !== null && (
                <line
                  stroke="rgba(255,255,255,0.28)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  x1="0"
                  x2="100"
                  y1={integratedY}
                  y2={integratedY}
                />
              )}

              {hoverPoint && (
                <>
                  <line
                    stroke="rgba(255,255,255,0.32)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    x1={hoverPoint.x}
                    x2={hoverPoint.x}
                    y1="0"
                    y2="100"
                  />
                  <circle
                    cx={hoverPoint.x}
                    cy={hoverPoint.y}
                    fill="white"
                    r="1.5"
                  />
                </>
              )}
            </svg>

            <div className="pointer-events-none absolute inset-x-4 bottom-3 flex justify-between text-xs text-white/35">
              <span>{formatTime(chartPoints[0].t)}</span>
              <span>{formatTime(chartPoints[chartPoints.length - 1].t)}</span>
            </div>

            <div className="pointer-events-none absolute left-4 top-3 text-xs text-white/35">
              louder
            </div>

            <div className="pointer-events-none absolute bottom-8 left-4 text-xs text-white/35">
              quieter
            </div>

            {hoverPoint && (
              <div
                className="pointer-events-none absolute rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs text-white shadow-xl"
                style={{
                  left: `${clamp(hoverPoint.x, 8, 82)}%`,
                  top: `${clamp(hoverPoint.y, 10, 72)}%`,
                }}
              >
                <div className="font-semibold tabular-nums">
                  {formatTime(hoverPoint.t)}
                </div>
                <div className="mt-1 text-white/70 tabular-nums">
                  {hoverPoint.lufs.toFixed(1)} LUFS
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-sm leading-6 text-white/40">
            Short-term LUFS data is not available yet. Re-run the local engine
            so analysis.loudness.short_term_lufs_series is written to
            analysis.json.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-white/50">
        <span className="font-medium text-white/70">Current basis:</span>{" "}
        {hasChart
          ? "real short-term LUFS time series from the local engine"
          : "no usable short-term LUFS time series"}
      </div>
    </section>
  );
}
