"use client";

type Props = {
  midRmsDbfs: number | null;
  sideRmsDbfs: number | null;
  ratio: number | null; // mid_side_energy_ratio (0..1)
};

function fmtDb(x: number) {
  const v = Math.round(x * 10) / 10;
  return v.toFixed(1);
}

export default function MidSideCard({ midRmsDbfs, sideRmsDbfs, ratio }: Props) {
  if (
    typeof midRmsDbfs !== "number" ||
    !Number.isFinite(midRmsDbfs) ||
    typeof sideRmsDbfs !== "number" ||
    !Number.isFinite(sideRmsDbfs) ||
    typeof ratio !== "number" ||
    !Number.isFinite(ratio)
  ) {
    return null;
  }

  const badge =
    ratio < 0.1
      ? { label: "INFO", badgeClass: "border-white/10 bg-white/5 text-white/60", valueClass: "text-white/60" }
      : ratio > 0.45
        ? { label: "WARN", badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200", valueClass: "text-yellow-300" }
        : { label: "OK", badgeClass: "border-white/10 bg-white/5 text-white/60", valueClass: "text-white/60" };

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-base font-semibold text-white/90">Mid/Side</span>
          <span className="mt-1 text-xs text-white/45">Center vs side energy balance</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={"text-[10px] px-2 py-0.5 rounded-full border " + badge.badgeClass}>
            {badge.label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-white/45">Ratio</span>
            <span className={"text-sm tabular-nums " + badge.valueClass}>{ratio.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-white/40">Mid RMS</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white/90">{fmtDb(midRmsDbfs)}</span>
            <span className="text-sm text-white/45">dBFS</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-white/40">Side RMS</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white/90">{fmtDb(sideRmsDbfs)}</span>
            <span className="text-sm text-white/45">dBFS</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <span>Side</span>
          <span>Mid</span>
        </div>

        <div className="mt-2 relative h-3 w-full rounded-full bg-white/10 overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 opacity-60" />

          <div
            className="absolute -top-2 transition-all duration-500 ease-out"
            style={{
              left: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-red-500 drop-shadow-lg" />
          </div>
        </div>

        <div className="mt-2 text-[10px] text-white/35">
          Higher ratio = stronger center (mid) dominance.
        </div>
      </div>
    </div>
  );
}
