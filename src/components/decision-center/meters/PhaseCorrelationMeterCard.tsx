"use client";

type PhaseCorrelationMeterCardProps = {
  value: number | null;
};

function getPhaseState(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      label: "NOT AVAILABLE",
      badgeClass: "border-white/10 bg-white/5 text-white/45",
      valueClass: "text-white/40",
      description:
        "Phase correlation data is not available for this local analysis output yet.",
    };
  }

  if (value < -0.2) {
    return {
      label: "CRITICAL",
      badgeClass: "border-red-400/30 bg-red-500/10 text-red-200",
      valueClass: "text-red-300",
      description:
        "The stereo signal may have strong mono compatibility issues.",
    };
  }

  if (value < 0) {
    return {
      label: "WARN",
      badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
      valueClass: "text-yellow-300",
      description:
        "Some parts of the stereo signal may become weaker in mono.",
    };
  }

  return {
    label: "OK",
    badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    valueClass: "text-emerald-200",
    description:
      "The stereo image looks stable from a phase correlation perspective.",
  };
}

export function PhaseCorrelationMeterCard({
  value,
}: PhaseCorrelationMeterCardProps) {
  const state = getPhaseState(value);
  const safeValue =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(-1, Math.min(1, value))
      : null;

  const markerLeftPct =
    safeValue === null ? 50 : ((safeValue + 1) / 2) * 100;

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            Stereo Meter
          </p>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
            Phase Correlation
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Stereo stability and mono safety check.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={
              "rounded-full border px-2.5 py-1 text-xs font-semibold " +
              state.badgeClass
            }
          >
            {state.label}
          </span>

          <span className={"text-2xl tabular-nums " + state.valueClass}>
            {safeValue === null ? "—" : safeValue.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative h-3 w-full overflow-visible rounded-full bg-white/10">
          <div
            className="absolute inset-0 rounded-full opacity-70"
            style={{
              background:
                "linear-gradient(90deg, rgba(239,68,68,1) 0%, rgba(239,68,68,1) 35%, rgba(250,204,21,1) 50%, rgba(16,185,129,1) 65%, rgba(16,185,129,1) 100%)",
            }}
          />

          <div className="absolute bottom-0 top-0 left-1/2 w-px bg-white/35" />

          <div
            className="absolute -top-2 transition-all duration-500 ease-out"
            style={{
              left: `${markerLeftPct}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="h-0 w-0 scale-110 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </div>
        </div>

        <div className="mt-2 flex justify-between text-sm text-white/40">
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-400">
        {state.description}
      </p>
    </section>
  );
}
