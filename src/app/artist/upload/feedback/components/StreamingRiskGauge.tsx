"use client";

type Props = {
  isReady: boolean;
  payload: any;
};

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";

type Tone = "good" | "warn" | "critical" | "neutral";

function toneForGain(gainDb: any): Tone {
  if (!(typeof gainDb === "number" && Number.isFinite(gainDb))) return "neutral";

  if (gainDb > 0) {
    if (gainDb >= 4) return "critical";
    if (gainDb >= 2) return "warn";
    return "good";
  }

  if (gainDb <= -8) return "critical";
  if (gainDb <= -4) return "warn";
  return "good";
}

function toneForApple(applied: any, desired: any, maxUp: any): Tone {
  const a = typeof applied === "number" && Number.isFinite(applied) ? applied : null;
  const d = typeof desired === "number" && Number.isFinite(desired) ? desired : null;
  const m = typeof maxUp === "number" && Number.isFinite(maxUp) ? maxUp : null;

  if (d !== null && d > 0 && m !== null && m < d) {
    const diff = d - m;
    if (diff >= 3) return "critical";
    if (diff >= 1) return "warn";
  }

  return toneForGain(a);
}

function asNumber(x: any): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

export default function StreamingRiskGauge({ isReady, payload }: Props) {
  const sn = payload?.metrics?.loudness?.streaming_normalization ?? null;

  const spotifyTone = toneForGain(sn?.spotify?.desired_gain_db ?? sn?.spotify?.applied_gain_db);
  const ytTone = toneForGain(sn?.youtube?.applied_gain_db);
  const appleTone = toneForApple(
    sn?.apple_music?.applied_gain_db,
    sn?.apple_music?.desired_gain_db,
    sn?.apple_music?.max_up_gain_db
  );

  const truePeakOvers = Array.isArray(payload?.events?.loudness?.true_peak_overs)
    ? payload.events.loudness.true_peak_overs.length
    : 0;

  let level: RiskLevel = "LOW";

  if (truePeakOvers > 0) {
    level = "HIGH";
  } else if (
    spotifyTone === "critical" ||
    ytTone === "critical" ||
    appleTone === "critical"
  ) {
    level = "HIGH";
  } else if (
    spotifyTone === "warn" ||
    ytTone === "warn" ||
    appleTone === "warn"
  ) {
    level = "MODERATE";
  } else {
    level = "LOW";
  }

  const worstDownGain = (() => {
    const spotifyApplied = asNumber(sn?.spotify?.applied_gain_db);
    const youtubeApplied = asNumber(sn?.youtube?.applied_gain_db);
    const appleApplied = asNumber(sn?.apple_music?.applied_gain_db);
    const applied = [spotifyApplied, youtubeApplied, appleApplied].filter(
      (x): x is number => typeof x === "number"
    );
    return applied.length ? Math.min(...applied) : null;
  })();
  const truePeakMax = asNumber(payload?.metrics?.loudness?.true_peak_dbtp_max);

  const label =
    level === "HIGH"
      ? "HIGH RISK"
      : level === "MODERATE"
      ? "MODERATE"
      : level === "LOW"
      ? "LOW"
      : "UNKNOWN";

  const borderClass =
    level === "HIGH"
      ? "border-red-500/60"
      : level === "MODERATE"
      ? "border-yellow-500/60"
      : level === "LOW"
      ? "border-emerald-500/60"
      : "border-white/10";

  const recommendation =
    level === "HIGH"
      ? "Reduce limiter stress and loudness. Platforms are turning your track down significantly."
      : level === "MODERATE"
      ? "You are close to heavy normalization. Consider easing limiting."
      : level === "LOW"
      ? "Streaming-safe. Minimal turn-down and no limiter stress detected."
      : "Not enough data yet.";

  return (
    <div
  className={`relative rounded-3xl border ${borderClass} p-10 transition-colors duration-300`}
  style={{
    background:
      "linear-gradient(180deg, rgba(18,18,20,0.95) 0%, rgba(12,12,14,0.95) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.6)"
  }}
>
      <h3 className="text-xl font-semibold text-white">Streaming Risk</h3>
      <p className="mt-1 text-sm text-white/60">
        Quick signal for normalization + true-peak stress.
      </p>

      <div className="mt-10 flex flex-col items-center">
        <div className="relative w-48 h-28">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <defs>
              <linearGradient id="riskGradientClean" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            {/* Base track */}
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Colored arc */}
            <path
              d="M20 100 A80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#riskGradientClean)"
              strokeWidth="10"
              strokeLinecap="round"
            />

            <g transform={`translate(100,100)`}>
              <g
                transform={`rotate(${
                  level === "LOW"
                    ? -70
                    : level === "MODERATE"
                    ? 0
                    : level === "HIGH"
                    ? 70
                    : -70
                })`}
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-78"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>

              <circle cx="0" cy="0" r="7" fill="white" />
            </g>
          </svg>
        </div>

        <div className="mt-5 text-xl font-semibold tracking-wide text-white">
          {label}
        </div>

        <p className="mt-2 text-sm text-white/70 text-center max-w-xs">
          {recommendation}
        </p>
      </div>
    </div>
  );
}
