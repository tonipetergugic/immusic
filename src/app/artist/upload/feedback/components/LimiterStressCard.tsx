"use client";

import { useMemo, useState } from "react";

type Props = {
  durationS: number | null;
  truePeakOvers: any[] | null;
};

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function LimiterStressCard({ durationS, truePeakOvers }: Props) {
  const overs = Array.isArray(truePeakOvers) ? truePeakOvers : null;
  const count = overs ? overs.length : null;

  const durationSec =
    typeof durationS === "number" && Number.isFinite(durationS) && durationS > 0
      ? durationS
      : null;

  // Events per minute
  const eventsPerMin =
    typeof count === "number" && typeof durationSec === "number"
      ? count / (durationSec / 60)
      : null;

  // Use t0 timestamps (filtering; no "every" hard-fail)
  const times =
    overs
      ? overs
          .map((e) =>
            e && typeof e.t0 === "number" && Number.isFinite(e.t0) ? e.t0 : null
          )
          .filter((t): t is number => typeof t === "number")
      : null;

  // Burst analysis: 10s windows
  let maxInWindow: number | null = null;
  let p95InWindow: number | null = null;

  if (times && times.length > 0 && typeof durationSec === "number") {
    const windowSize = 10; // seconds
    const bins = Math.max(1, Math.ceil(durationSec / windowSize));
    const counts = new Array(bins).fill(0);

    for (const t of times) {
      const i = Math.max(0, Math.min(bins - 1, Math.floor(t / windowSize)));
      counts[i] += 1;
    }

    const sorted = [...counts].sort((a, b) => a - b);
    maxInWindow = sorted[sorted.length - 1] ?? 0;
    const idx = Math.max(
      0,
      Math.min(sorted.length - 1, Math.floor(0.95 * (sorted.length - 1)))
    );
    p95InWindow = sorted[idx] ?? 0;
  }

  // --- Heatmap (60 bins over full duration) ---
  const BIN_COUNT = 60;
  let heatmapBins: number[] | null = null;

  if (times && times.length > 0 && typeof durationSec === "number") {
    const binSize = durationSec / BIN_COUNT;
    const bins = new Array(BIN_COUNT).fill(0);

    for (const t of times) {
      const idx = Math.max(0, Math.min(BIN_COUNT - 1, Math.floor(t / binSize)));
      bins[idx] += 1;
    }

    heatmapBins = bins;
  }

  const maxBin =
    heatmapBins && heatmapBins.length > 0 ? Math.max(...heatmapBins) : null;

  const [hoverBin, setHoverBin] = useState<number | null>(null);

  const hoverInfo = useMemo(() => {
    if (
      hoverBin === null ||
      !heatmapBins ||
      !durationSec ||
      !Number.isFinite(durationSec)
    )
      return null;

    const binSize = durationSec / BIN_COUNT;
    const start = hoverBin * binSize;
    const end = Math.min(durationSec, (hoverBin + 1) * binSize);
    const v = heatmapBins[hoverBin] ?? 0;

    let severity: "low" | "mid" | "high" = "low";
    if (maxBin && maxBin > 0) {
      const r = v / maxBin;
      severity = r > 0.66 ? "high" : r > 0.33 ? "mid" : "low";
    }

    return { start, end, v, severity };
  }, [hoverBin, heatmapBins, durationSec, maxBin]);

  // Label thresholds (agreed)
  let tone: "good" | "warn" | "critical" | "neutral" = "neutral";

  if (typeof eventsPerMin === "number") {
    const maxW = typeof maxInWindow === "number" ? maxInWindow : null;

    const ok = eventsPerMin < 20 && (maxW === null || maxW < 8);
    const critical = eventsPerMin > 60 || (maxW !== null && maxW > 20);

    tone = critical ? "critical" : ok ? "good" : "warn";
  }

  const toneClass =
    tone === "critical"
      ? "border-red-500/30 bg-red-500/5"
      : tone === "warn"
        ? "border-yellow-500/30 bg-yellow-500/5"
        : tone === "good"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.03]";

  const METRIC_TITLE = "text-[10px] uppercase tracking-wider text-white/40";
  const METRIC_VALUE = "mt-2 text-xl font-semibold text-white tabular-nums";

  const label =
    tone === "good"
      ? "OK"
      : tone === "warn"
        ? "MODERATE"
        : tone === "critical"
          ? "CRITICAL"
          : "—";

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Limiter Stress</h3>
          <p className="mt-1 text-sm text-white/60">
            How often the signal hits near 0 dBTP over time.
          </p>
        </div>

        <div className="text-sm font-semibold text-white/85 tabular-nums">
          {label}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={"rounded-2xl border px-4 py-4 " + toneClass}>
          <div className={METRIC_TITLE}>Events / min</div>
          <div className={METRIC_VALUE}>
            {typeof eventsPerMin === "number" ? eventsPerMin.toFixed(1) : "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className={METRIC_TITLE}>Max / 10s</div>
          <div className={METRIC_VALUE}>
            {typeof maxInWindow === "number" ? maxInWindow : "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className={METRIC_TITLE}>P95 / 10s</div>
          <div className={METRIC_VALUE}>
            {typeof p95InWindow === "number" ? p95InWindow : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-white/70 leading-snug max-w-3xl">
        {tone === "good" && "Limiter activity looks controlled across the track."}
        {tone === "warn" &&
          "Limiter activity is noticeable. Consider slightly more headroom or gentler bus compression."}
        {tone === "critical" &&
          "High limiter stress. Risk of distortion, especially after MP3/AAC encoding. Lower ceiling or reduce master gain."}
        {tone === "neutral" && "—"}
      </div>

      {heatmapBins && maxBin !== null && maxBin > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Stress distribution over time
            </div>

            {hoverInfo ? (
              <div className="text-xs text-white/70 tabular-nums">
                {fmtTime(hoverInfo.start)}–{fmtTime(hoverInfo.end)} · {hoverInfo.v} ev ·{" "}
                {hoverInfo.severity.toUpperCase()}
              </div>
            ) : (
              <div className="text-xs text-white/40">Hover a bar</div>
            )}
          </div>

          <div className="flex items-end w-full h-24 gap-[2px]">
            {heatmapBins.map((v, i) => {
              const intensity = v / maxBin; // 0–1
              const opacity = 0.15 + intensity * 0.85;
              const heightPct = Math.max(2, Math.round(intensity * 100)); // min 2%

              const colorClass =
                intensity > 0.66
                  ? "bg-red-500"
                  : intensity > 0.33
                    ? "bg-yellow-400"
                    : "bg-white";

              return (
                <div
                  key={i}
                  className={`flex-1 ${colorClass} rounded-sm`}
                  style={{ opacity, height: `${heightPct}%` }}
                  onMouseEnter={() => setHoverBin(i)}
                  onMouseLeave={() => setHoverBin(null)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
