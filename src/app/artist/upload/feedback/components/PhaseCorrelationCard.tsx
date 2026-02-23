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

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
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
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 opacity-70" />

          {/* Marker */}
          <div
            className="absolute -top-2 transition-all duration-500 ease-out"
            style={{
              left: `${((value + 1) / 2) * 100}%`,
              transform: "translateX(-50%)"
            }}
          >
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-red-500 drop-shadow-lg" />
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
