"use client";

import * as React from "react";

type Point = { t: number; lufs: number };

function isFiniteNumber(v: any): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export default function ShortTermLufsChart(props: {
  points: Point[];
  height?: number;
  title?: string;
}) {
  const height = typeof props.height === "number" ? props.height : 140;
  const title = props.title ?? "Short-term loudness (LUFS over time)";

  const raw = Array.isArray(props.points) ? props.points : [];
  // ebur128 emits very low sentinel values during silence (e.g. -120.7).
  // For visualization we drop those, otherwise the Y-scale becomes unusable.
  const SILENCE_FLOOR_LUFS = -70; // purely UI; does NOT affect analysis/storage
  const points = raw
    .filter((p) => p && isFiniteNumber(p.t) && isFiniteNumber(p.lufs) && p.lufs > SILENCE_FLOOR_LUFS)
    .slice(0, 5000);

  if (points.length < 2) {
    return (
      <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
        <div className="text-xs text-white/70 mb-2">{title}</div>
        <div className="text-xs text-white/40">—</div>
      </div>
    );
  }

  // Dimensions
  const w = 600; // internal viewBox width
  const h = height;
  const padL = 36;
  const padR = 12;
  const padT = 10;
  const padB = 22;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;

  let lMin = Infinity;
  let lMax = -Infinity;
  for (const p of points) {
    if (p.lufs < lMin) lMin = p.lufs;
    if (p.lufs > lMax) lMax = p.lufs;
  }

  // Expand a bit for nicer framing (deterministic)
  const range = Math.max(0.5, lMax - lMin);
  lMin = lMin - range * 0.08;
  lMax = lMax + range * 0.08;

  const x = (t: number) => {
    const u = (t - tMin) / Math.max(0.000001, tMax - tMin);
    return padL + u * (w - padL - padR);
  };

  const y = (lufs: number) => {
    const u = (lufs - lMin) / Math.max(0.000001, lMax - lMin);
    // invert
    return padT + (1 - u) * (h - padT - padB);
  };

  const pathD = (() => {
    let d = `M ${x(points[0].t).toFixed(2)} ${y(points[0].lufs).toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${x(points[i].t).toFixed(2)} ${y(points[i].lufs).toFixed(2)}`;
    }
    return d;
  })();

  // y-grid (3 lines)
  const grid = [0.0, 0.5, 1.0].map((u) => {
    const yy = padT + u * (h - padT - padB);
    return { yy, u };
  });

  // Hover state
  const [hover, setHover] = React.useState<{ i: number; x: number; y: number } | null>(null);

  const onMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const rect = (e.currentTarget as any).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ux = clamp((px - padL) / Math.max(1, rect.width - (padL + padR) * (rect.width / w)), 0, 1);

    // map ux back to time
    const t = tMin + ux * (tMax - tMin);

    // binary-ish search nearest by time (points are time-ordered)
    let lo = 0;
    let hi = points.length - 1;
    while (hi - lo > 8) {
      const mid = (lo + hi) >> 1;
      if (points[mid].t < t) lo = mid;
      else hi = mid;
    }
    let best = lo;
    let bestDist = Infinity;
    for (let i = lo; i <= hi; i++) {
      const d = Math.abs(points[i].t - t);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    const hx = x(points[best].t);
    const hy = y(points[best].lufs);
    setHover({ i: best, x: hx, y: hy });
  };

  const onLeave = () => setHover(null);

  const fmtT = (sec: number) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = s - m * 60;
    return `${m}:${r.toFixed(1).padStart(4, "0")}`;
  };

  const fmtL = (v: number) => `${v.toFixed(1)} LUFS`;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-white/70">{title}</div>
        <div className="text-[10px] text-white/35 tabular-nums">
          {fmtT(first.t)} → {fmtT(last.t)}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-[140px] select-none"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          {/* grid */}
          {grid.map((g, idx) => (
            <line
              key={idx}
              x1={padL}
              x2={w - padR}
              y1={g.yy}
              y2={g.yy}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}

          {/* y labels (top/mid/bot) */}
          <text x={6} y={padT + 10} fontSize="10" fill="rgba(255,255,255,0.35)">
            {fmtL(lMax)}
          </text>
          <text x={6} y={padT + (h - padT - padB) / 2 + 4} fontSize="10" fill="rgba(255,255,255,0.30)">
            {fmtL((lMin + lMax) / 2)}
          </text>
          <text x={6} y={h - padB + 2} fontSize="10" fill="rgba(255,255,255,0.35)">
            {fmtL(lMin)}
          </text>

          {/* path */}
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" />

          {/* hover marker */}
          {hover ? (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={padT}
                y2={h - padB}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <circle cx={hover.x} cy={hover.y} r="3.5" fill="rgba(255,255,255,0.9)" />
            </>
          ) : null}
        </svg>

        {hover ? (
          <div
            className="absolute top-2 right-2 rounded-md border border-white/10 bg-black/60 px-2 py-1"
            style={{ pointerEvents: "none" }}
          >
            <div className="text-[10px] text-white/70 tabular-nums">
              {fmtT(points[hover.i].t)}
            </div>
            <div className="text-xs text-white/85 tabular-nums">
              {fmtL(points[hover.i].lufs)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 text-[10px] text-white/35">
        Hover to inspect. Purely technical (no taste).
      </div>
    </div>
  );
}
