"use client";

type StreamingNormalizationMeterCardProps = {
  integratedLufs: number | null;
  truePeakDbtp: number | null;
};

const STREAMING_REFERENCE_LUFS = -14;

function isValidNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value: number | null, suffix = "") {
  if (!isValidNumber(value)) {
    return "—";
  }

  return `${value.toFixed(2)}${suffix}`;
}

function getEstimatedGainDb(integratedLufs: number | null) {
  if (!isValidNumber(integratedLufs)) {
    return null;
  }

  return STREAMING_REFERENCE_LUFS - integratedLufs;
}

function getStreamingState(
  integratedLufs: number | null,
  truePeakDbtp: number | null,
) {
  if (!isValidNumber(integratedLufs) && !isValidNumber(truePeakDbtp)) {
    return {
      label: "NOT AVAILABLE",
      badgeClass: "border-white/10 bg-white/5 text-white/45",
      valueClass: "text-white/40",
      description:
        "Streaming normalization data is not available for this local analysis output yet.",
    };
  }

  const estimatedGainDb = getEstimatedGainDb(integratedLufs);

  const hasTruePeakRisk =
    isValidNumber(truePeakDbtp) && truePeakDbtp > -1;
  const hasStrongGainReduction =
    isValidNumber(estimatedGainDb) && estimatedGainDb <= -8;

  if (hasTruePeakRisk || hasStrongGainReduction) {
    return {
      label: "CHECK",
      badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
      valueClass: "text-yellow-300",
      description:
        "This master may be turned down noticeably on normalized playback, or the true peak may be worth checking before release.",
    };
  }

  return {
    label: "OK",
    badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    valueClass: "text-emerald-200",
    description:
      "The available loudness values suggest a manageable streaming normalization result.",
  };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getLoudnessMarkerPercent(integratedLufs: number | null) {
  if (!isValidNumber(integratedLufs)) {
    return 50;
  }

  const minLufs = -24;
  const maxLufs = -6;
  const normalized = ((integratedLufs - minLufs) / (maxLufs - minLufs)) * 100;

  return clampPercent(normalized);
}

export function StreamingNormalizationMeterCard({
  integratedLufs,
  truePeakDbtp,
}: StreamingNormalizationMeterCardProps) {
  const estimatedGainDb = getEstimatedGainDb(integratedLufs);
  const state = getStreamingState(integratedLufs, truePeakDbtp);
  const markerLeftPct = getLoudnessMarkerPercent(integratedLufs);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            Loudness Meter
          </p>

          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
            Streaming Normalization
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Estimated playback gain based on integrated LUFS.
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
            {formatNumber(estimatedGainDb, " dB")}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Integrated LUFS
          </p>
          <p className="mt-3 text-2xl tabular-nums text-white">
            {formatNumber(integratedLufs, " LUFS")}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Measured full-track loudness.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Estimated gain
          </p>
          <p className="mt-3 text-2xl tabular-nums text-white">
            {formatNumber(estimatedGainDb, " dB")}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Based on a -14 LUFS reference.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            True peak
          </p>
          <p className="mt-3 text-2xl tabular-nums text-white">
            {formatNumber(truePeakDbtp, " dBTP")}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Peak safety signal from the current engine output.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-white/40">
          <span>Integrated loudness</span>
          <span>{formatNumber(integratedLufs, " LUFS")}</span>
        </div>

        <div className="relative h-3 w-full overflow-visible rounded-full bg-white/10">
          <div
            className="absolute inset-0 rounded-full opacity-70"
            style={{
              background:
                "linear-gradient(90deg, rgba(16,185,129,1) 0%, rgba(16,185,129,1) 45%, rgba(250,204,21,1) 70%, rgba(239,68,68,1) 100%)",
            }}
          />

          <div
            className="absolute bottom-0 top-0 w-px bg-white/50"
            style={{
              left: `${getLoudnessMarkerPercent(STREAMING_REFERENCE_LUFS)}%`,
            }}
          />

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
          <span>-24</span>
          <span>-14</span>
          <span>-6</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-400">
        {state.description}
      </p>
    </section>
  );
}
