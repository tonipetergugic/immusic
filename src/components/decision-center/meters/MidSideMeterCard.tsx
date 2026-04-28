"use client";

type MidSideMeterCardProps = {
  stereoWidth: number | null;
  sideMidRatio: number | null;
  phaseCorrelation: number | null;
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

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getWidthPercent(stereoWidth: number | null) {
  if (!isValidNumber(stereoWidth)) {
    return 0;
  }

  if (stereoWidth <= 1) {
    return clampPercent(stereoWidth * 100);
  }

  return clampPercent(stereoWidth);
}

function getPhasePercent(phaseCorrelation: number | null) {
  if (!isValidNumber(phaseCorrelation)) {
    return 50;
  }

  const safeValue = Math.max(-1, Math.min(1, phaseCorrelation));

  return ((safeValue + 1) / 2) * 100;
}

function getWidthState(
  stereoWidth: number | null,
  phaseCorrelation: number | null,
) {
  if (!isValidNumber(stereoWidth) && !isValidNumber(phaseCorrelation)) {
    return {
      label: "NOT AVAILABLE",
      badgeClass: "border-white/10 bg-white/5 text-white/45",
      description:
        "Stereo width data is not available for this local analysis output yet.",
    };
  }

  const widthPercent = getWidthPercent(stereoWidth);
  const hasPhaseRisk = isValidNumber(phaseCorrelation) && phaseCorrelation < 0;

  if (hasPhaseRisk || widthPercent > 95) {
    return {
      label: "CHECK",
      badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
      description:
        "Stereo width may need checking for mono compatibility or excessive side energy.",
    };
  }

  return {
    label: "OK",
    badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    description:
      "Stereo width looks controlled from the available mid/side indicators.",
  };
}

export function MidSideMeterCard({
  stereoWidth,
  sideMidRatio,
  phaseCorrelation,
}: MidSideMeterCardProps) {
  const widthPercent = getWidthPercent(stereoWidth);
  const phasePercent = getPhasePercent(phaseCorrelation);
  const state = getWidthState(stereoWidth, phaseCorrelation);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            Stereo Meter
          </p>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
            Mid / Side Balance
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Checks stereo width and side-to-mid balance from the current
            analysis output.
          </p>
        </div>

        <span
          className={
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold " +
            state.badgeClass
          }
        >
          {state.label}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm uppercase tracking-wider text-white/40">
            Stereo Width
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {formatNumber(stereoWidth)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm uppercase tracking-wider text-white/40">
            Side / Mid Ratio
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {formatNumber(sideMidRatio)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm uppercase tracking-wider text-white/40">
            Phase Correlation
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {formatNumber(phaseCorrelation)}
          </div>
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-2 flex justify-between text-sm text-white/45">
          <span>Center</span>
          <span>Wide</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300/80 transition-all duration-500 ease-out"
            style={{ width: `${widthPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm text-white/45">
          <span>Out of phase</span>
          <span>Mono-safe</span>
        </div>

        <div className="relative h-3 rounded-full bg-white/10">
          <div
            className="absolute inset-0 rounded-full opacity-70"
            style={{
              background:
                "linear-gradient(90deg, rgba(239,68,68,1) 0%, rgba(250,204,21,1) 50%, rgba(16,185,129,1) 100%)",
            }}
          />

          <div
            className="absolute -top-2 transition-all duration-500 ease-out"
            style={{
              left: `${phasePercent}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="h-0 w-0 scale-110 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-400">
        {state.description}
      </p>
    </section>
  );
}
