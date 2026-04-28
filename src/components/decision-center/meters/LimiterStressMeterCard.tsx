"use client";

type LimiterStressTone = "good" | "warn" | "critical" | "unknown";

type LimiterStressTimelineItem = {
  startSec: number;
  endSec: number;
  stressEventCount: number;
  maxPeakDbtp: number | null;
  risk: "low" | "medium" | "high";
};

type LimiterStressMeterCardProps = {
  truePeakDbtp: number | null;
  peakDbfs: number | null;
  clippedSampleCount: number | null;
  plrLu: number | null;
  crestFactorDb: number | null;
  eventsPerMin?: number | null;
  maxEventsPer10s?: number | null;
  p95EventsPer10s?: number | null;
  timeline?: LimiterStressTimelineItem[];
};

function isValidNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

function formatMetric(value: number | null | undefined, digits = 0) {
  if (!isValidNumber(value ?? null)) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

function formatTimeRange(startSec: number, endSec: number) {
  return `${Math.round(startSec)}–${Math.round(endSec)}s`;
}

function getTimelineBarClass(risk: LimiterStressTimelineItem["risk"]) {
  if (risk === "high") {
    return "bg-red-400/85";
  }

  if (risk === "medium") {
    return "bg-yellow-300/80";
  }

  return "bg-emerald-300/60";
}

function getBarHeightPercent(
  item: LimiterStressTimelineItem,
  maxEventsPer10s: number | null | undefined,
) {
  const maxValue =
    isValidNumber(maxEventsPer10s ?? null) && Number(maxEventsPer10s) > 0
      ? Number(maxEventsPer10s)
      : Math.max(item.stressEventCount, 1);

  return Math.max(8, Math.min(100, (item.stressEventCount / maxValue) * 100));
}

function getLimiterStressTone({
  truePeakDbtp,
  clippedSampleCount,
  plrLu,
  crestFactorDb,
}: {
  truePeakDbtp: number | null;
  clippedSampleCount: number | null;
  plrLu: number | null;
  crestFactorDb: number | null;
}): LimiterStressTone {
  const hasAnyValue = [
    truePeakDbtp,
    clippedSampleCount,
    plrLu,
    crestFactorDb,
  ].some(isValidNumber);

  if (!hasAnyValue) {
    return "unknown";
  }

  const hasCriticalPeak = isValidNumber(truePeakDbtp) && truePeakDbtp >= 0;
  const hasCriticalClipping =
    isValidNumber(clippedSampleCount) && clippedSampleCount > 100;
  const hasVeryLowPlr = isValidNumber(plrLu) && plrLu < 6;
  const hasVeryLowCrest = isValidNumber(crestFactorDb) && crestFactorDb < 6;

  if (
    hasCriticalPeak ||
    hasCriticalClipping ||
    hasVeryLowPlr ||
    hasVeryLowCrest
  ) {
    return "critical";
  }

  const hasPeakWarning = isValidNumber(truePeakDbtp) && truePeakDbtp > -1;
  const hasClippingWarning =
    isValidNumber(clippedSampleCount) && clippedSampleCount > 0;
  const hasLowPlr = isValidNumber(plrLu) && plrLu < 8;
  const hasLowCrest = isValidNumber(crestFactorDb) && crestFactorDb < 8;

  if (hasPeakWarning || hasClippingWarning || hasLowPlr || hasLowCrest) {
    return "warn";
  }

  return "good";
}

function getLimiterStressLabel(tone: LimiterStressTone) {
  if (tone === "good") {
    return "OK";
  }

  if (tone === "warn") {
    return "MODERATE";
  }

  if (tone === "critical") {
    return "CRITICAL";
  }

  return "—";
}

function getToneClass(tone: LimiterStressTone) {
  if (tone === "critical") {
    return "border-red-500/30 bg-red-500/5";
  }

  if (tone === "warn") {
    return "border-yellow-500/30 bg-yellow-500/5";
  }

  if (tone === "good") {
    return "border-emerald-500/30 bg-emerald-500/5";
  }

  return "border-white/10 bg-white/[0.03]";
}

function getBadgeClass(tone: LimiterStressTone) {
  if (tone === "critical") {
    return "bg-red-500/15 text-red-400 border border-red-500/30";
  }

  if (tone === "warn") {
    return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";
  }

  if (tone === "good") {
    return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
  }

  return "bg-white/10 text-white/60 border border-white/10";
}

function getDescription(tone: LimiterStressTone) {
  if (tone === "good") {
    return "Limiter and peak indicators look controlled from the available analysis data.";
  }

  if (tone === "warn") {
    return "Limiter or peak indicators are noticeable. It may be worth checking headroom, bus compression or final limiter settings.";
  }

  if (tone === "critical") {
    return "Limiter stress may be high. Check for distortion risk, true peak safety and how the master behaves after AAC or MP3 encoding.";
  }

  return "Limiter stress data is not available for this local analysis output yet.";
}

export function LimiterStressMeterCard({
  truePeakDbtp,
  peakDbfs,
  clippedSampleCount,
  plrLu,
  crestFactorDb,
  eventsPerMin = null,
  maxEventsPer10s = null,
  p95EventsPer10s = null,
  timeline = [],
}: LimiterStressMeterCardProps) {
  const tone = getLimiterStressTone({
    truePeakDbtp,
    clippedSampleCount,
    plrLu,
    crestFactorDb,
  });

  const toneClass = getToneClass(tone);
  const label = getLimiterStressLabel(tone);
  const hasTimeline = timeline.length > 0;

  const metricTitle = "text-sm uppercase tracking-wider text-white/40";
  const metricValue = "mt-2 text-2xl font-semibold text-white tabular-nums";

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8">
      <div className="flex items-start justify-end">
        <div
          className={
            "rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide tabular-nums " +
            getBadgeClass(tone)
          }
        >
          {label}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={"rounded-2xl border px-4 py-4 " + toneClass}>
          <div className={metricTitle}>True Peak</div>
          <div className={metricValue}>{formatNumber(truePeakDbtp, " dBTP")}</div>
          <div className="mt-2 text-xs leading-5 text-white/40">
            Peak safety signal.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className={metricTitle}>Clipped Samples</div>
          <div className={metricValue}>{formatInteger(clippedSampleCount)}</div>
          <div className="mt-2 text-xs leading-5 text-white/40">
            Detected sample clipping.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className={metricTitle}>PLR / Crest</div>
          <div className={metricValue}>{formatNumber(plrLu, " LU")}</div>
          <div className="mt-2 text-xs leading-5 text-white/40">
            Crest: {formatNumber(crestFactorDb, " dB")}
          </div>
        </div>
      </div>

      <div className="mt-4 max-w-3xl text-sm leading-snug text-white/70">
        {getDescription(tone)}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm uppercase tracking-wider text-white/40">
            Stress distribution over time
          </div>

          <div className="text-sm text-white/40">
            {hasTimeline ? `${timeline.length} windows` : "Not available yet"}
          </div>
        </div>

        {hasTimeline ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-xs uppercase tracking-wider text-white/35">
                  Events / min
                </div>
                <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                  {formatMetric(eventsPerMin, 1)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-xs uppercase tracking-wider text-white/35">
                  Max / 10s
                </div>
                <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                  {formatMetric(maxEventsPer10s, 0)}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-xs uppercase tracking-wider text-white/35">
                  P95 / 10s
                </div>
                <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                  {formatMetric(p95EventsPer10s, 0)}
                </div>
              </div>
            </div>

            <div className="flex h-32 items-end gap-1.5 overflow-hidden rounded-xl border border-white/10 bg-black/30 px-3 pb-3 pt-4">
              {timeline.map((item) => (
                <div
                  key={`${item.startSec}-${item.endSec}`}
                  className="group relative flex h-full flex-1 items-end"
                  title={`${formatTimeRange(
                    item.startSec,
                    item.endSec,
                  )}: ${item.stressEventCount} events, ${item.risk} risk`}
                >
                  <div
                    className={
                      "w-full rounded-t-sm transition-opacity group-hover:opacity-100 " +
                      getTimelineBarClass(item.risk)
                    }
                    style={{
                      height: `${getBarHeightPercent(
                        item,
                        maxEventsPer10s,
                      )}%`,
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/40">
              <span>Low</span>
              <span className="text-yellow-300/80">Medium</span>
              <span className="text-red-400/85">High</span>
            </div>
          </div>
        ) : (
          <div className="flex h-24 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-sm leading-6 text-white/40">
            Event-based limiter stress over time will appear here once the engine
            provides real limiter stress timeline data.
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 text-sm text-white/50 sm:grid-cols-2">
        <div>
          <span className="text-white/35">Peak DBFS:</span>{" "}
          {formatNumber(peakDbfs, " dBFS")}
        </div>
        <div>
          <span className="text-white/35">Current basis:</span>{" "}
          {hasTimeline
            ? "event-based limiter stress timeline"
            : "static loudness and peak metrics"}
        </div>
      </div>
    </div>
  );
}
