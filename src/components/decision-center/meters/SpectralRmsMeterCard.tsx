"use client";

type SpectralRmsMeterCardProps = {
  subRmsDbfs: number | null;
  lowRmsDbfs: number | null;
  midRmsDbfs: number | null;
  highRmsDbfs: number | null;
  airRmsDbfs: number | null;
};

type SpectralBand = {
  key: string;
  label: string;
  value: number;
};

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatDbfs(value: number) {
  return value.toFixed(1);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function posFromDbfs(dbfs: number, maxBand: number) {
  const relative = dbfs - maxBand;
  const clamped = Math.max(-24, Math.min(0, relative));

  return clamp01((clamped - -24) / 24);
}

export function SpectralRmsMeterCard({
  subRmsDbfs,
  lowRmsDbfs,
  midRmsDbfs,
  highRmsDbfs,
  airRmsDbfs,
}: SpectralRmsMeterCardProps) {
  const rawBands: Array<{ key: string; label: string; value: number | null }> = [
    { key: "sub", label: "Sub", value: subRmsDbfs },
    { key: "low", label: "Low", value: lowRmsDbfs },
    { key: "mid", label: "Mid", value: midRmsDbfs },
    { key: "high", label: "High", value: highRmsDbfs },
    { key: "air", label: "Air", value: airRmsDbfs },
  ];

  const bands = rawBands.filter(
    (band): band is SpectralBand => isValidNumber(band.value),
  );

  const hasBands = bands.length > 1;
  const maxBand = hasBands ? Math.max(...bands.map((band) => band.value)) : null;

  const linePoints =
    hasBands && maxBand !== null
      ? bands
          .map((band, index) => {
            const x = (index / (bands.length - 1)) * 100;
            const y = 100 - posFromDbfs(band.value, maxBand) * 100;

            return `${x},${y}`;
          })
          .join(" ")
      : "";

  const areaPath =
    hasBands && maxBand !== null
      ? `M 0,100 L ${bands
          .map((band, index) => {
            const x = (index / (bands.length - 1)) * 100;
            const y = 100 - posFromDbfs(band.value, maxBand) * 100;

            return `${x},${y}`;
          })
          .join(" L ")} L 100,100 Z`
      : "";

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl shadow-black/30 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.22em] text-white/40">
            Tonal energy
          </div>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Spectral RMS
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Shows how much RMS energy sits in broad frequency areas. This is a
            measurement view, not an automatic EQ judgment.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          {hasBands ? "AVAILABLE" : "NOT AVAILABLE"}
        </div>
      </div>

      {hasBands && maxBand !== null ? (
        <>
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm tabular-nums text-white/60">
                relative: 0 … -24 dB
              </span>
            </div>

            <div className="relative mt-3 h-44 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <svg
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="spectralRmsFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(0,255,198,0.35)" />
                    <stop offset="100%" stopColor="rgba(0,255,198,0.02)" />
                  </linearGradient>

                  <filter id="spectralRmsGlow">
                    <feGaussianBlur result="coloredBlur" stdDeviation="2.5" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <path d={areaPath} fill="url(#spectralRmsFill)" />

                <polyline
                  fill="none"
                  filter="url(#spectralRmsGlow)"
                  points={linePoints}
                  stroke="rgba(0,255,198,0.35)"
                  strokeWidth="4"
                />

                <polyline
                  fill="none"
                  points={linePoints}
                  stroke="rgba(0,255,198,0.95)"
                  strokeWidth="2"
                />
              </svg>

              <div className="absolute left-3 top-2 text-sm text-white/35">0</div>
              <div className="absolute bottom-2 left-3 text-sm text-white/35">
                -24
              </div>
            </div>

            <div className="relative mt-4 h-12">
              {bands.map((band, index) => {
                const x = (index / (bands.length - 1)) * 100;

                return (
                  <div
                    key={band.key}
                    className="absolute text-center"
                    style={{
                      left: `${x}%`,
                      transform: "translateX(-50%)",
                      width: "80px",
                    }}
                  >
                    <div className="text-sm text-white/45">{band.label}</div>
                    <div className="text-sm tabular-nums text-white/55">
                      {formatDbfs(band.value - maxBand)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-5">
            {bands.map((band) => (
              <div
                key={`value-${band.key}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="text-xs uppercase tracking-wider text-white/35">
                  {band.label}
                </div>
                <div className="mt-2 text-xl font-semibold text-white tabular-nums">
                  {formatDbfs(band.value)}
                </div>
                <div className="mt-1 text-xs text-white/35">dBFS</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-sm leading-6 text-white/40">
          Spectral RMS data is not available yet. Re-run the local engine so
          analysis.spectral_rms is written to analysis.json.
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-white/50">
        <span className="font-medium text-white/70">Current basis:</span>{" "}
        {hasBands
          ? "real bandpass time-domain RMS values from the local engine"
          : "no usable spectral RMS values"}
      </div>
    </section>
  );
}
