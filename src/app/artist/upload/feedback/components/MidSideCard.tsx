"use client";

type Props = {
  midRmsDbfs: number | null;
  sideRmsDbfs: number | null;
  widthIndex: number | null; // stereo_width_index = side^2 / (mid^2 + side^2), [0..1]
};

function fmtDb(x: number) {
  const v = Math.round(x * 10) / 10;
  return v.toFixed(1);
}

export default function MidSideCard({ midRmsDbfs, sideRmsDbfs, widthIndex }: Props) {
  if (
    typeof midRmsDbfs !== "number" ||
    !Number.isFinite(midRmsDbfs) ||
    typeof sideRmsDbfs !== "number" ||
    !Number.isFinite(sideRmsDbfs) ||
    typeof widthIndex !== "number" ||
    !Number.isFinite(widthIndex)
  ) {
    return null;
  }

  const w = Math.max(0, Math.min(1, widthIndex));
  const markerLeftPct = w * 100;

  const badge =
    w < 0.2
      ? {
          label: "CENTER-HEAVY",
          badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
          valueClass: "text-yellow-300",
        }
      : w <= 0.45
        ? {
            label: "BALANCED",
            badgeClass: "border-white/10 bg-white/5 text-white/80",
            valueClass: "text-white/80",
          }
        : {
            label: "WIDE",
            badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
            valueClass: "text-emerald-300",
          };

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-base font-semibold text-white/90">Mid/Side</span>
          <span className="mt-1 text-sm text-white/45">Center vs side energy balance</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={"text-sm px-2 py-0.5 rounded-full border " + badge.badgeClass}>
            {badge.label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-white/45">Width</span>
            <span className={"text-2xl tabular-nums " + badge.valueClass}>
              {Math.round(w * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-4">
          <div className="text-sm uppercase tracking-wide text-white/40">Mid RMS</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white/90">{fmtDb(midRmsDbfs)}</span>
            <span className="text-sm text-white/45">dBFS</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-4">
          <div className="text-sm uppercase tracking-wide text-white/40">Side RMS</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white/90">{fmtDb(sideRmsDbfs)}</span>
            <span className="text-sm text-white/45">dBFS</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm text-white/40">
          <span>Center</span>
          <span>Wide</span>
        </div>

        <div className="mt-2 relative h-3 w-full rounded-full bg-white/10 overflow-visible">
          <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(90deg, rgba(251,146,60,1) 0%, rgba(16,185,129,1) 40%, rgba(16,185,129,1) 60%, rgba(251,146,60,1) 100%)",
          }}
        />

          <div
            className="absolute -top-2 transition-all duration-500 ease-out"
            style={{
              left: `${markerLeftPct}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110" />
          </div>
        </div>

        <div className="mt-2 text-sm text-white/35">
          Width near the middle is typical. Low width is center-focused; high width is very wide.
        </div>
      </div>
    </div>
  );
}
