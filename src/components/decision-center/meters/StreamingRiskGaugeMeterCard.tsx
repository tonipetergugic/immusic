"use client";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";

type StreamingRiskGaugeMeterCardProps = {
  integratedLufs: number | null;
  truePeakDbtp: number | null;
  clippedSampleCount: number | null;
  peakDbfs: number | null;
};

const STREAMING_REFERENCE_LUFS = -14;

function isValidNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getEstimatedGainDb(integratedLufs: number | null) {
  if (!isValidNumber(integratedLufs)) {
    return null;
  }

  return STREAMING_REFERENCE_LUFS - integratedLufs;
}

function formatNumber(value: number | null, suffix = "") {
  if (!isValidNumber(value)) {
    return "—";
  }

  return `${value.toFixed(2)}${suffix}`;
}

function formatInteger(value: number | null) {
  if (!isValidNumber(value)) {
    return "—";
  }

  return Math.round(value).toLocaleString("en-US");
}

function getRiskLevel({
  integratedLufs,
  truePeakDbtp,
  clippedSampleCount,
}: {
  integratedLufs: number | null;
  truePeakDbtp: number | null;
  clippedSampleCount: number | null;
}): RiskLevel {
  const hasAnyValue = [
    integratedLufs,
    truePeakDbtp,
    clippedSampleCount,
  ].some(isValidNumber);

  if (!hasAnyValue) {
    return "UNKNOWN";
  }

  const estimatedGainDb = getEstimatedGainDb(integratedLufs);

  const hasHighTurnDown =
    isValidNumber(estimatedGainDb) && estimatedGainDb <= -8;
  const hasTruePeakRisk =
    isValidNumber(truePeakDbtp) && truePeakDbtp >= 0;
  const hasClippingRisk =
    isValidNumber(clippedSampleCount) && clippedSampleCount > 100;

  if (hasHighTurnDown || hasTruePeakRisk || hasClippingRisk) {
    return "HIGH";
  }

  const hasModerateTurnDown =
    isValidNumber(estimatedGainDb) && estimatedGainDb <= -4;
  const hasTruePeakWarning =
    isValidNumber(truePeakDbtp) && truePeakDbtp > -1;
  const hasClippingWarning =
    isValidNumber(clippedSampleCount) && clippedSampleCount > 0;

  if (hasModerateTurnDown || hasTruePeakWarning || hasClippingWarning) {
    return "MODERATE";
  }

  return "LOW";
}

function getNeedleRotation(level: RiskLevel) {
  if (level === "LOW") {
    return -70;
  }

  if (level === "MODERATE") {
    return 0;
  }

  if (level === "HIGH") {
    return 70;
  }

  return -70;
}

function getLabel(level: RiskLevel) {
  if (level === "HIGH") {
    return "HIGH RISK";
  }

  if (level === "MODERATE") {
    return "MODERATE";
  }

  if (level === "LOW") {
    return "LOW";
  }

  return "UNKNOWN";
}

function getBorderClass(level: RiskLevel) {
  if (level === "HIGH") {
    return "border-red-500/60";
  }

  if (level === "MODERATE") {
    return "border-yellow-500/60";
  }

  if (level === "LOW") {
    return "border-emerald-500/60";
  }

  return "border-white/10";
}

function getRecommendation(level: RiskLevel) {
  if (level === "HIGH") {
    return "Streaming playback may reduce level noticeably, or peak safety may need checking before release.";
  }

  if (level === "MODERATE") {
    return "Streaming translation looks usable, but loudness or peak headroom may be worth checking.";
  }

  if (level === "LOW") {
    return "Streaming risk looks low from the available loudness and peak data.";
  }

  return "Not enough streaming risk data is available yet.";
}

export function StreamingRiskGaugeMeterCard({
  integratedLufs,
  truePeakDbtp,
  clippedSampleCount,
  peakDbfs,
}: StreamingRiskGaugeMeterCardProps) {
  const level = getRiskLevel({
    integratedLufs,
    truePeakDbtp,
    clippedSampleCount,
  });

  const estimatedGainDb = getEstimatedGainDb(integratedLufs);

  return (
    <div
      className={
        "relative rounded-3xl border p-10 transition-colors duration-300 " +
        getBorderClass(level)
      }
      style={{
        background:
          "linear-gradient(180deg, rgba(18,18,20,0.95) 0%, rgba(12,12,14,0.95) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.6)",
      }}
    >
      <h3 className="text-2xl font-semibold text-white">Streaming Risk</h3>

      <p className="mt-1 text-sm text-white/60">
        Quick signal for normalization, clipping and true-peak stress.
      </p>

      <div className="mt-10 flex flex-col items-center">
        <div className="relative h-28 w-48">
          <svg viewBox="0 0 200 120" className="h-full w-full">
            <defs>
              <linearGradient
                id="streamingRiskGaugeGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeLinecap="round"
              strokeWidth="10"
            />

            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#streamingRiskGaugeGradient)"
              strokeLinecap="round"
              strokeWidth="10"
            />

            <g transform="translate(100,100)">
              <g transform={`rotate(${getNeedleRotation(level)})`}>
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-78"
                  stroke="white"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </g>

              <circle cx="0" cy="0" r="7" fill="white" />
            </g>
          </svg>
        </div>

        <div className="mt-5 text-2xl font-semibold tracking-wide text-white">
          {getLabel(level)}
        </div>

        <p className="mt-2 max-w-xs text-center text-sm text-white/70">
          {getRecommendation(level)}
        </p>
      </div>

      <div className="mt-8 grid gap-3 text-sm text-white/50 sm:grid-cols-2">
        <div>
          <span className="text-white/35">Integrated LUFS:</span>{" "}
          {formatNumber(integratedLufs, " LUFS")}
        </div>

        <div>
          <span className="text-white/35">Estimated gain:</span>{" "}
          {formatNumber(estimatedGainDb, " dB")}
        </div>

        <div>
          <span className="text-white/35">True Peak:</span>{" "}
          {formatNumber(truePeakDbtp, " dBTP")}
        </div>

        <div>
          <span className="text-white/35">Clipped Samples:</span>{" "}
          {formatInteger(clippedSampleCount)}
        </div>

        <div>
          <span className="text-white/35">Peak DBFS:</span>{" "}
          {formatNumber(peakDbfs, " dBFS")}
        </div>

        <div>
          <span className="text-white/35">Current basis:</span>{" "}
          static loudness and peak metrics
        </div>
      </div>
    </div>
  );
}
