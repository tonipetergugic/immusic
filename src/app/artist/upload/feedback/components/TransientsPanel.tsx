"use client";

type Props = {
  attackStrength: number | null;
  transientDensity: number | null;
  p95ShortCrestDb: number | null;
  meanShortCrestDb: number | null;
  transientDensityCv: number | null;
};

export default function TransientsPanel({
  attackStrength,
  transientDensity,
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

  const METRIC_TITLE = "text-[10px] uppercase tracking-wider text-white/40";
  const METRIC_VALUE = "mt-2 text-xl font-semibold text-white tabular-nums";

  // Punch Balance thresholds (domain-local; keep deterministic & documented)
  const PUNCH_OVERCOMPRESSED_ATTACK_LT = 40;
  const PUNCH_FLAT_ATTACK_LT = 50;

  // Using p95 short-window crest as transient-specific dynamic proxy (dB)
  const PUNCH_OVERCOMPRESSED_P95_CREST_LT_DB = 8;
  const PUNCH_FLAT_P95_CREST_LT_DB = 9;

  // Density condition for overcompression heuristic (events/sec)
  const PUNCH_OVERCOMPRESSED_DENSITY_GT = 0.12;

  // Punch balance
  let punchBalance: string | null = null;
  if (
    typeof attackStrength === "number" &&
    typeof p95ShortCrestDb === "number" &&
    typeof transientDensity === "number"
  ) {
    if (
      attackStrength < PUNCH_OVERCOMPRESSED_ATTACK_LT &&
      p95ShortCrestDb < PUNCH_OVERCOMPRESSED_P95_CREST_LT_DB &&
      transientDensity > PUNCH_OVERCOMPRESSED_DENSITY_GT
    ) {
      punchBalance = "Overcompressed";
    } else if (
      attackStrength < PUNCH_FLAT_ATTACK_LT &&
      p95ShortCrestDb < PUNCH_FLAT_P95_CREST_LT_DB
    ) {
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

  const attackPct =
    typeof attackStrength === "number"
      ? Math.max(0, Math.min(100, attackStrength))
      : null;

  let attackBarClass = "bg-white/70";
  if (typeof attackStrength === "number") {
    if (attackStrength < 40) attackBarClass = "bg-yellow-400/80";
    else if (attackStrength < 70) attackBarClass = "bg-emerald-400/80";
    else attackBarClass = "bg-red-400/80";
  }

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
    <div className="h-full rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8 flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          Transients & Punch
        </h3>

        {typeof attackStrength === "number" &&
          typeof p95ShortCrestDb === "number" &&
          typeof transientDensity === "number" && (
            <div className="text-xs text-white/40 tabular-nums text-right">
              <div>Attack: {attackStrength}</div>
              <div>P95 Crest: {p95ShortCrestDb.toFixed(2)} dB</div>
              <div>Density: {transientDensity.toFixed(2)}</div>
            </div>
          )}
      </div>

      <div>
        <div className={METRIC_TITLE}>Attack Strength</div>

        <div className={METRIC_VALUE}>
          {typeof attackStrength === "number" ? `${attackStrength} / 100` : "—"}
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${attackBarClass}`}
            style={{ width: `${attackPct ?? 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <span className="text-base font-medium text-white/50">Transient Density</span>
        <span className={`text-xl font-semibold ${densityColorClass}`}>
          {densityLabel ?? "—"}
        </span>
      </div>

      <div className="flex items-center justify-between mt-8">
        <span className="text-base font-medium text-white/50">Crest Spread</span>

        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50 tabular-nums">
            {typeof crestSpreadDb === "number" ? `${crestSpreadDb.toFixed(2)} dB` : "—"}
          </span>

          <span className={`text-xl font-semibold ${crestSpreadColorClass}`}>
            {crestSpreadLabel ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <span className="text-base font-medium text-white/50">Transient Stability</span>

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

      <div className="flex items-center justify-between mt-8">
        <span className="text-base font-medium text-white/50">Punch Balance</span>
        <span className={`text-xl font-semibold ${punchColorClass}`}>
          {punchBalance ?? "—"}
        </span>
      </div>
    </div>
  );
}
