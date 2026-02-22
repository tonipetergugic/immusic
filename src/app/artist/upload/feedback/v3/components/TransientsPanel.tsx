"use client";

type Props = {
  attackStrength: number | null;
  transientDensity: number | null;
  crestFactorDb: number | null;
  p95ShortCrestDb: number | null;
  meanShortCrestDb: number | null;
  transientDensityCv: number | null;
};

export default function TransientsPanel({
  attackStrength,
  transientDensity,
  crestFactorDb,
  p95ShortCrestDb,
  meanShortCrestDb,
  transientDensityCv,
}: Props) {
  // Density label
  let densityLabel: string | null = null;
  if (typeof transientDensity === "number") {
    if (transientDensity < 0.07) densityLabel = "Low";
    else if (transientDensity <= 0.15) densityLabel = "Moderate";
    else densityLabel = "High";
  }

  // Density color
  let densityColorClass = "text-white";
  if (densityLabel === "Low") densityColorClass = "text-yellow-400";
  else if (densityLabel === "Moderate") densityColorClass = "text-emerald-400";
  else if (densityLabel === "High") densityColorClass = "text-red-400";

  // Punch balance
  let punchBalance: string | null = null;
  if (
    typeof attackStrength === "number" &&
    typeof crestFactorDb === "number" &&
    typeof transientDensity === "number"
  ) {
    if (attackStrength < 40 && crestFactorDb < 8 && transientDensity > 0.12) {
      punchBalance = "Overcompressed";
    } else if (attackStrength < 50 && crestFactorDb < 9) {
      punchBalance = "Flat";
    } else {
      punchBalance = "Healthy";
    }
  }

  // Punch color
  let punchColorClass = "text-white";
  if (punchBalance === "Healthy") punchColorClass = "text-emerald-400";
  else if (punchBalance === "Flat") punchColorClass = "text-yellow-400";
  else if (punchBalance === "Overcompressed") punchColorClass = "text-red-400";

  const METRIC_TITLE = "text-[10px] uppercase tracking-wider text-white/40";
  const METRIC_VALUE = "mt-2 text-xl font-semibold text-white tabular-nums";

  const attackPct =
    typeof attackStrength === "number"
      ? Math.max(0, Math.min(100, attackStrength))
      : null;

  const crestSpreadDb =
    typeof p95ShortCrestDb === "number" && typeof meanShortCrestDb === "number"
      ? p95ShortCrestDb - meanShortCrestDb
      : null;

  let crestSpreadLabel: string | null = null;

  if (typeof crestSpreadDb === "number") {
    if (crestSpreadDb < 1.5) crestSpreadLabel = "Tight";
    else if (crestSpreadDb <= 3.5) crestSpreadLabel = "Normal";
    else crestSpreadLabel = "Spiky";
  }

  let crestSpreadColorClass = "text-white";
  if (crestSpreadLabel === "Tight") crestSpreadColorClass = "text-emerald-400";
  else if (crestSpreadLabel === "Normal") crestSpreadColorClass = "text-yellow-400";
  else if (crestSpreadLabel === "Spiky") crestSpreadColorClass = "text-red-400";

  let stabilityLabel: string | null = null;

  if (typeof transientDensityCv === "number") {
    if (transientDensityCv < 0.35) stabilityLabel = "Stable";
    else if (transientDensityCv <= 0.75) stabilityLabel = "Moderate";
    else stabilityLabel = "Irregular";
  }

  let stabilityColorClass = "text-white";

  if (stabilityLabel === "Stable") stabilityColorClass = "text-emerald-400";
  else if (stabilityLabel === "Moderate") stabilityColorClass = "text-yellow-400";
  else if (stabilityLabel === "Irregular") stabilityColorClass = "text-red-400";

  return (
    <div className="h-full rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8 flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-6">Transients & Punch</h3>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <div className={METRIC_TITLE}>Attack Strength</div>

        <div className={METRIC_VALUE}>
          {typeof attackStrength === "number" ? `${attackStrength} / 100` : "—"}
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/70"
            style={{ width: `${attackPct ?? 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <span className="text-sm text-neutral-400">Transient Density</span>
        <span className={`text-xl font-semibold ${densityColorClass}`}>
          {densityLabel ?? "—"}
        </span>
      </div>

      <div className="flex items-center justify-between mt-6">
        <span className="text-sm text-neutral-400">Crest Spread</span>

        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50 tabular-nums">
            {typeof crestSpreadDb === "number" ? `${crestSpreadDb.toFixed(2)} dB` : "—"}
          </span>

          <span className={`text-xl font-semibold ${crestSpreadColorClass}`}>
            {crestSpreadLabel ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <span className="text-sm text-neutral-400">Transient Stability</span>

        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50 tabular-nums">
            {typeof transientDensityCv === "number"
              ? transientDensityCv.toFixed(2)
              : "—"}
          </span>

          <span className={`text-xl font-semibold ${stabilityColorClass}`}>
            {stabilityLabel ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <span className="text-sm text-neutral-400">Punch Balance</span>
        <span className={`text-xl font-semibold ${punchColorClass}`}>
          {punchBalance ?? "—"}
        </span>
      </div>
    </div>
  );
}
