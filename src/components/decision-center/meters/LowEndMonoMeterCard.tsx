"use client";

type LowEndMonoMeterCardProps = {
  phaseCorrelationLowBand: number | null;
  monoLossLowBandPercent: number | null;
  lowBandBalanceDb: number | null;
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

function getLowEndState(
  phaseCorrelationLowBand: number | null,
  monoLossLowBandPercent: number | null,
) {
  if (
    !isValidNumber(phaseCorrelationLowBand) &&
    !isValidNumber(monoLossLowBandPercent)
  ) {
    return {
      label: "NOT AVAILABLE",
      badgeClass: "border-white/10 bg-white/5 text-white/45",
      valueClass: "text-white/40",
      description:
        "Low-end mono stability data is not available for this local analysis output yet.",
    };
  }

  const hasCriticalPhase =
    isValidNumber(phaseCorrelationLowBand) && phaseCorrelationLowBand < 0;
  const hasCriticalMonoLoss =
    isValidNumber(monoLossLowBandPercent) && monoLossLowBandPercent > 25;

  if (hasCriticalPhase || hasCriticalMonoLoss) {
    return {
      label: "CHECK",
      badgeClass: "border-red-400/30 bg-red-500/10 text-red-200",
      valueClass: "text-red-300",
      description:
        "The low end may lose power in mono. This is worth checking on a mono speaker or club-style playback system.",
    };
  }

  const hasWarningPhase =
    isValidNumber(phaseCorrelationLowBand) && phaseCorrelationLowBand < 0.2;
  const hasWarningMonoLoss =
    isValidNumber(monoLossLowBandPercent) && monoLossLowBandPercent > 12;

  if (hasWarningPhase || hasWarningMonoLoss) {
    return {
      label: "WATCH",
      badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
      valueClass: "text-yellow-300",
      description:
        "The low end looks mostly usable, but there may be some mono translation risk.",
    };
  }

  return {
    label: "OK",
    badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    valueClass: "text-emerald-200",
    description:
      "The low end suggests stable mono translation from the available analysis data.",
  };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function LowEndMonoMeterCard({
  phaseCorrelationLowBand,
  monoLossLowBandPercent,
  lowBandBalanceDb,
}: LowEndMonoMeterCardProps) {
  const state = getLowEndState(
    phaseCorrelationLowBand,
    monoLossLowBandPercent,
  );

  const safePhase = isValidNumber(phaseCorrelationLowBand)
    ? Math.max(-1, Math.min(1, phaseCorrelationLowBand))
    : null;

  const phaseMarkerLeftPct =
    safePhase === null ? 50 : ((safePhase + 1) / 2) * 100;

  const monoLossBarPct = isValidNumber(monoLossLowBandPercent)
    ? clampPercent(monoLossLowBandPercent)
    : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            Low-End Meter
          </p>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
            Low End Mono Stability
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Checks whether the bass range appears stable when collapsed to mono.
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
            {formatNumber(phaseCorrelationLowBand)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Low-band phase
          </p>
          <p className="mt-3 text-2xl tabular-nums text-white">
            {formatNumber(phaseCorrelationLowBand)}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            -1 to +1 correlation range.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Mono loss
          </p>
          <p className="mt-3 text-2xl tabular-nums text-white">
            {formatNumber(monoLossLowBandPercent, "%")}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Estimated low-band energy loss in mono.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Low-band balance
          </p>
          <p className="mt-3 text-2xl tabular-nums text-white">
            {formatNumber(lowBandBalanceDb, " dB")}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Balance signal from the current engine output.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-white/40">
          <span>Phase correlation</span>
          <span>{formatNumber(phaseCorrelationLowBand)}</span>
        </div>

        <div className="relative h-3 w-full overflow-visible rounded-full bg-white/10">
          <div
            className="absolute inset-0 rounded-full opacity-70"
            style={{
              background:
                "linear-gradient(90deg, rgba(239,68,68,1) 0%, rgba(239,68,68,1) 40%, rgba(250,204,21,1) 60%, rgba(16,185,129,1) 100%)",
            }}
          />

          <div className="absolute bottom-0 top-0 left-1/2 w-px bg-white/35" />

          <div
            className="absolute -top-2 transition-all duration-500 ease-out"
            style={{
              left: `${phaseMarkerLeftPct}%`,
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

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-white/40">
          <span>Mono loss</span>
          <span>{formatNumber(monoLossLowBandPercent, "%")}</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300/70 transition-all duration-500 ease-out"
            style={{ width: `${monoLossBarPct}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-sm text-white/40">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-400">
        {state.description}
      </p>
    </section>
  );
}
