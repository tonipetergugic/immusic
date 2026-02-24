"use client";

type Props = {
  value: number | null;
};

export default function PhaseCorrelationCard({ value }: Props) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  const badge =
    value < -0.2
      ? { label: "CRITICAL", badgeClass: "border-red-400/30 bg-red-500/10 text-red-200", valueClass: "text-red-300" }
      : value < 0
        ? { label: "WARN", badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200", valueClass: "text-yellow-300" }
        : { label: "OK", badgeClass: "border-white/10 bg-white/5 text-white/60", valueClass: "text-white/50" };

  const clampedValue = Math.max(-1, Math.min(1, value));
  const markerLeftPct = ((clampedValue + 1) / 2) * 100;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white/90">Phase Correlation</span>
          <span className="mt-1 text-xs text-white/45">Stereo stability • mono safety</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={"text-[10px] px-2 py-0.5 rounded-full border " + badge.badgeClass}>
            {badge.label}
          </span>
          <span className={"text-sm tabular-nums " + badge.valueClass}>
            {value.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Heatbar */}
      <div className="mt-5">
        <div className="relative h-3 w-full rounded-full bg-white/10 overflow-visible">
          <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "linear-gradient(90deg, rgba(239,68,68,1) 0%, rgba(239,68,68,1) 35%, rgba(250,204,21,1) 50%, rgba(16,185,129,1) 65%, rgba(16,185,129,1) 100%)",
          }}
        />

          {/* Zero reference line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/35" />

          {/* Marker */}
          <div
            className="absolute -top-2 transition-all duration-500 ease-out"
            style={{
              left: `${markerLeftPct}%`,
              transform: "translateX(-50%)"
            }}
          >
            <div
              className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110"
            />
          </div>
        </div>

        <div className="mt-2 flex justify-between text-[10px] text-white/40">
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
      </div>
    </div>
  );
}
