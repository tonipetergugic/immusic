"use client";

type Tone = "good" | "warn" | "critical";

type EngineeringDynamicsMeterCardProps = {
  integratedLufs: number | null;
  loudnessRangeLu: number | null;
  crestFactorDb: number | null;
  plrLu: number | null;
  integratedRmsDbfs: number | null;
};

function isValidNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toneClass(tone: Tone) {
  if (tone === "critical") {
    return "border-red-500/30 bg-red-500/5";
  }

  if (tone === "warn") {
    return "border-yellow-500/30 bg-yellow-500/5";
  }

  return "border-emerald-500/30 bg-emerald-500/5";
}

function toneForLufs(value: number): Tone {
  if (value > -7 || value < -20) {
    return "critical";
  }

  if ((value >= -20 && value < -16) || (value > -9 && value <= -7)) {
    return "warn";
  }

  return "good";
}

function toneForLra(value: number): Tone {
  if (value < 3 || value > 14) {
    return "critical";
  }

  if ((value >= 3 && value < 5) || (value > 12 && value <= 14)) {
    return "warn";
  }

  return "good";
}

function toneForCrest(value: number): Tone {
  if (value < 5 || value > 14) {
    return "critical";
  }

  if ((value >= 5 && value < 7) || (value > 12 && value <= 14)) {
    return "warn";
  }

  return "good";
}

function formatValue(value: number | null, decimals: number) {
  if (!isValidNumber(value)) {
    return "—";
  }

  return value.toFixed(decimals);
}

export function EngineeringDynamicsMeterCard({
  integratedLufs,
  loudnessRangeLu,
  crestFactorDb,
  plrLu,
  integratedRmsDbfs,
}: EngineeringDynamicsMeterCardProps) {
  const metrics = [
    {
      key: "Integrated LUFS",
      value: integratedLufs,
      formatDecimals: 1,
      tone: toneForLufs,
    },
    {
      key: "Loudness Range (LRA)",
      value: loudnessRangeLu,
      formatDecimals: 1,
      tone: toneForLra,
    },
    {
      key: "Crest Factor (dB)",
      value: crestFactorDb,
      formatDecimals: 2,
      tone: toneForCrest,
    },
  ];

  return (
    <section className="h-full">
      <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8">
        <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const metricValue = metric.value;
            const hasValue = isValidNumber(metricValue);

            return (
              <div
                key={metric.key}
                className={
                  "rounded-2xl border px-4 py-4 " +
                  (hasValue
                    ? toneClass(metric.tone(metricValue))
                    : "border-white/10 bg-white/[0.03]")
                }
              >
                <div className="text-sm uppercase tracking-wider text-white/40">
                  {metric.key}
                </div>

                <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
                  {formatValue(metric.value, metric.formatDecimals)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm uppercase tracking-wider text-white/40">
                Dynamics score
              </div>

              <div className="mt-2 flex items-baseline gap-3">
                <div className="text-4xl font-semibold tabular-nums text-white/35">
                  —
                </div>
                <div className="text-base tabular-nums text-white/35">/100</div>

                <span className="ml-2 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold tracking-wide text-white/50">
                  Not available yet
                </span>
              </div>
            </div>

            <div className="shrink-0 text-sm text-white/40">
              Score not calculated yet.
            </div>
          </div>

          <div className="mt-5">
            <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/15"
                style={{
                  width: "0%",
                }}
              />
            </div>

            <div className="mt-2 text-sm text-white/45">
              Low LRA can cap the label — keep musical contrast while avoiding
              over-compression.
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-white/50 sm:grid-cols-2">
          <div>
            <span className="text-white/35">PLR:</span>{" "}
            {formatValue(plrLu, 2)} LU
          </div>

          <div>
            <span className="text-white/35">Integrated RMS:</span>{" "}
            {formatValue(integratedRmsDbfs, 2)} dBFS
          </div>
        </div>
      </div>
    </section>
  );
}
