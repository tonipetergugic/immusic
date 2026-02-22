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
    <div className="rounded-2xl bg-white/3 border border-white/7 p-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white/90">Phase Correlation</span>
          <span className="mt-1 text-xs text-white/45">Stereo stability • mono safety</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={"text-[10px] px-2 py-0.5 rounded-full border " + badge.badgeClass}>
            {badge.label}
          </span>
          <span className={"text-sm tabular-nums " + badge.valueClass}>{value.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
