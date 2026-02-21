import React from "react";

type Props = {
  vals01: number[] | null;
  mode: "before" | "after";
  impact01: number;
  barMaxScale: number;
};

export default function AnalyzerBars({ vals01, mode, impact01, barMaxScale }: Props) {
  const W = 240;
  const H = 40;
  const baselineY = 32;
  const barMax = 22 * Math.max(0.8, Math.min(2.2, barMaxScale));

  const n = vals01?.length ?? 34;
  const gap = 2;
  const barW = (W - (n - 1) * gap) / n;

  const isAfter = mode === "after";
  const glowOn = isAfter && impact01 >= 0.55;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block"
      shapeRendering="crispEdges"
    >
      <defs>
        <linearGradient id="diBeforeFill" x1="0" x2="1">
          <stop offset="0%" stopColor="#6B9EFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#6B9EFF" stopOpacity="0.25" />
        </linearGradient>

        <linearGradient id="diAfterFill" x1="0" x2="1">
          <stop offset="0%" stopColor="#FF9500" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFB347" stopOpacity="0.70" />
        </linearGradient>

        <filter id="diGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="
              1 0 0 0 0
              0 0.75 0 0 0
              0 0 0.15 0 0
              0 0 0 0.35 0"
            result="c"
          />
          <feMerge>
            <feMergeNode in="c" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* baseline */}
      <rect x="0" y={baselineY} width={W} height="1" fill="rgba(255,255,255,0.08)" />

      {/* bars */}
      {Array.from({ length: n }).map((_, i) => {
        const v = vals01 ? (vals01[i] ?? 0) : 0;

        const hh = Math.max(1, Math.round(v * barMax));
        const x = i * (barW + gap);

        const minRead = 2;
        const h2 = Math.max(minRead, hh);

        return (
          <rect
            key={i}
            x={x.toFixed(2)}
            y={(baselineY - h2).toFixed(2)}
            width={barW.toFixed(2)}
            height={h2.toFixed(2)}
            rx="0.6"
            fill={isAfter ? "url(#diAfterFill)" : "url(#diBeforeFill)"}
            opacity={isAfter ? 1 : 0.9}
            filter={glowOn ? "url(#diGlow)" : undefined}
          />
        );
      })}
    </svg>
  );
}
