type TruePeakOverEvent = {
  t0: number;
  t1: number;
  severity?: "info" | "warn" | "critical";
  value?: number; // peak dBTP
};

export function TruePeakHeatbar({
  durationS,
  overs,
}: {
  durationS: number | null;
  overs: TruePeakOverEvent[] | null;
}) {
  if (!durationS || !Number.isFinite(durationS) || durationS <= 0) {
    return (
      <div className="text-[11px] text-white/50">
        True peak timeline unavailable (duration missing).
      </div>
    );
  }

  if (!Array.isArray(overs)) return null;

  // If no overs, render empty baseline to communicate "no issues"
  const hasOvers = overs.length > 0;

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    const ss = s.toFixed(2).padStart(5, "0");
    return `${String(m).padStart(2, "0")}:${ss}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/70">True Peak Timeline</div>
        <div className="text-[11px] text-white/50 tabular-nums">
          {hasOvers ? `${overs.length} event${overs.length === 1 ? "" : "s"}` : "no overs"}
        </div>
      </div>

      <div className="relative h-3 w-full rounded bg-white/10 overflow-hidden border border-white/10">
        {overs.map((ev, i) => {
          const t0 = typeof ev?.t0 === "number" ? ev.t0 : null;
          const t1 = typeof ev?.t1 === "number" ? ev.t1 : null;
          const val = typeof ev?.value === "number" ? ev.value : null;

          if (t0 === null || t1 === null) return null;

          const left = Math.max(0, Math.min(100, (t0 / durationS) * 100));
          const width = Math.max(0.2, Math.min(100 - left, ((t1 - t0) / durationS) * 100));

          const sev =
            ev?.severity === "critical" ? "critical" : ev?.severity === "warn" ? "warn" : "info";

          const cls =
            sev === "critical"
              ? "bg-red-500/80"
              : sev === "warn"
                ? "bg-yellow-500/80"
                : "bg-white/40";

          const title = `${fmt(t0)} – ${fmt(t1)}${val === null ? "" : ` | ${val.toFixed(3)} dBTP`}`;

          return (
            <div
              key={i}
              className={`absolute top-0 h-full ${cls} hover:opacity-100 opacity-90`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={title}
            />
          );
        })}
      </div>

      <div className="text-[11px] text-white/50">
        Hover segments for time range and peak value.
      </div>
    </div>
  );
}
