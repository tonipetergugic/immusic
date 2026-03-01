"use client";

type Spectral = {
  sub_rms_dbfs?: number | null;
  low_rms_dbfs?: number | null;
  low_mid_rms_dbfs?: number | null;
  mid_rms_dbfs?: number | null;
  high_mid_rms_dbfs?: number | null;
  high_rms_dbfs?: number | null;
  air_rms_dbfs?: number | null;
};

type Props = {
  spectral: Spectral | null;
};

function fmtDbfs(x: number) {
  const v = Math.round(x * 10) / 10;
  return v.toFixed(1);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// Relative mapping (0 dB = strongest band, -24 dB floor)
function posFromDbfs(dbfs: number, maxBand: number) {
  const relative = dbfs - maxBand; // 0 … negative
  const clamped = Math.max(-24, Math.min(0, relative));
  return clamp01((clamped - -24) / (0 - -24));
}

export default function SpectralRmsCard({ spectral }: Props) {
  if (!spectral) return null;

  const bands = [
    { key: "sub", label: "Sub", v: spectral.sub_rms_dbfs ?? null },
    { key: "low", label: "Low", v: spectral.low_rms_dbfs ?? null },
    { key: "low_mid", label: "Low-Mid", v: spectral.low_mid_rms_dbfs ?? null },
    { key: "mid", label: "Mid", v: spectral.mid_rms_dbfs ?? null },
    { key: "high_mid", label: "High-Mid", v: spectral.high_mid_rms_dbfs ?? null },
    { key: "high", label: "High", v: spectral.high_rms_dbfs ?? null },
    { key: "air", label: "Air", v: spectral.air_rms_dbfs ?? null },
  ].filter((b) => typeof b.v === "number" && Number.isFinite(b.v as number)) as Array<{
    key: string;
    label: string;
    v: number;
  }>;

  if (bands.length === 0) return null;

  const maxBand = Math.max(...bands.map((b) => b.v));

  const linePoints = bands
    .map((b, i) => {
      const x = (i / (bands.length - 1)) * 100; // NO PADDING (0..100)
      const y = 100 - posFromDbfs(b.v, maxBand) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath = (() => {
    const pts = bands
      .map((b, i) => {
        const x = (i / (bands.length - 1)) * 100; // NO PADDING (0..100)
        const y = 100 - posFromDbfs(b.v, maxBand) * 100;
        return `${x},${y}`;
      })
      .join(" L ");

    return `M 0,100 L ${pts} L 100,100 Z`;
  })();

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8">
      <div className="mt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm tabular-nums text-white/60">relative: 0 … -24 dB</span>
        </div>

        <div className="mt-3 relative h-28 w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="spectralFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0,255,198,0.35)" />
                <stop offset="100%" stopColor="rgba(0,255,198,0.02)" />
              </linearGradient>

              <filter id="spectralGlow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* AREA */}
            <path d={areaPath} fill="url(#spectralFill)" />

            {/* GLOW LINE */}
            <polyline
              fill="none"
              stroke="rgba(0,255,198,0.35)"
              strokeWidth="4"
              filter="url(#spectralGlow)"
              points={linePoints}
            />

            {/* MAIN LINE */}
            <polyline fill="none" stroke="rgba(0,255,198,0.95)" strokeWidth="2" points={linePoints} />
          </svg>

          {/* axis labels */}
          <div className="absolute left-3 top-2 text-sm text-white/35">0</div>
          <div className="absolute left-3 bottom-2 text-sm text-white/35">-24</div>
        </div>

        {/* Labels aligned to the SAME x positions (0..100). Keep width to avoid overlap. */}
        <div className="mt-4 relative h-10">
          {bands.map((b, i) => {
            const x = (i / (bands.length - 1)) * 100; // NO PADDING (0..100)
            return (
              <div
                key={`lbl-${b.key}`}
                className="absolute text-center"
                style={{
                  left: `${x}%`,
                  transform: "translateX(-50%)",
                  width: "80px",
                }}
              >
                <div className="text-sm text-white/45">{b.label}</div>
                <div className="text-sm tabular-nums text-white/55">{fmtDbfs(b.v - maxBand)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
