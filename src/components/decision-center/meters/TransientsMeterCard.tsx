"use client";

type TransientTimelineItem = {
  startSec: number;
  endSec: number;
  transientCount: number;
  densityPerSec: number;
  meanShortCrestDb: number | null;
  p95ShortCrestDb: number | null;
};

type TransientsMeterCardProps = {
  attackStrength: number | null;
  transientDensityPerSec: number | null;
  p95ShortCrestDb: number | null;
  meanShortCrestDb: number | null;
  transientDensityCv: number | null;
  timeline: TransientTimelineItem[];
};

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return isValidNumber(value) ? value.toFixed(digits) : "—";
}

function formatTimeRange(startSec: number, endSec: number) {
  return `${Math.round(startSec)}–${Math.round(endSec)}s`;
}

function getAttackPercent(attackStrength: number | null) {
  if (!isValidNumber(attackStrength)) {
    return null;
  }

  if (attackStrength <= 1) {
    return clampPercent(attackStrength * 100);
  }

  return clampPercent(attackStrength);
}

function getAttackLabel(attackPercent: number | null) {
  if (!isValidNumber(attackPercent)) {
    return null;
  }

  if (attackPercent < 40) return "Soft";
  if (attackPercent < 70) return "Controlled";
  if (attackPercent < 85) return "Punchy";

  return "Aggressive";
}

function getAttackColorClass(label: string | null) {
  if (label === "Soft") return "text-blue-300";
  if (label === "Controlled") return "text-emerald-300";
  if (label === "Punchy") return "text-amber-300";
  if (label === "Aggressive") return "text-red-300";

  return "text-white";
}

function getDensityLabel(densityPerSec: number | null) {
  if (!isValidNumber(densityPerSec)) {
    return null;
  }

  if (densityPerSec < 3) return "Sparse";
  if (densityPerSec < 7) return "Moderate";
  if (densityPerSec < 11) return "Dense";

  return "Very dense";
}

function getDensityColorClass(label: string | null) {
  if (label === "Sparse") return "text-blue-300";
  if (label === "Moderate") return "text-emerald-300";
  if (label === "Dense") return "text-amber-300";
  if (label === "Very dense") return "text-red-300";

  return "text-white";
}

function getCrestSpreadLabel(crestSpreadDb: number | null) {
  if (!isValidNumber(crestSpreadDb)) {
    return null;
  }

  if (crestSpreadDb < 1.5) return "Tight";
  if (crestSpreadDb <= 3.5) return "Normal";

  return "Spiky";
}

function getCrestSpreadColorClass(label: string | null) {
  if (label === "Tight") return "text-emerald-300";
  if (label === "Normal") return "text-yellow-300";
  if (label === "Spiky") return "text-red-300";

  return "text-white";
}

function getStabilityLabel(transientDensityCv: number | null) {
  if (!isValidNumber(transientDensityCv)) {
    return null;
  }

  if (transientDensityCv < 0.35) return "Stable";
  if (transientDensityCv <= 0.75) return "Moderate";

  return "Irregular";
}

function getStabilityColorClass(label: string | null) {
  if (label === "Stable") return "text-emerald-300";
  if (label === "Moderate") return "text-yellow-300";
  if (label === "Irregular") return "text-red-300";

  return "text-white";
}

function getPunchProfile(
  attackPercent: number | null,
  p95ShortCrestDb: number | null,
  transientDensityPerSec: number | null,
) {
  if (
    !isValidNumber(attackPercent) ||
    !isValidNumber(p95ShortCrestDb) ||
    !isValidNumber(transientDensityPerSec)
  ) {
    return null;
  }

  if (
    attackPercent < 40 &&
    p95ShortCrestDb < 8 &&
    transientDensityPerSec > 7
  ) {
    return "Check compression";
  }

  if (attackPercent < 50 && p95ShortCrestDb < 9) {
    return "Soft punch";
  }

  return "Clear punch";
}

function getPunchColorClass(label: string | null) {
  if (label === "Clear punch") return "text-emerald-300";
  if (label === "Soft punch") return "text-yellow-300";
  if (label === "Check compression") return "text-red-300";

  return "text-white";
}

function getTimelineBarClass(item: TransientTimelineItem) {
  if (item.densityPerSec >= 11) {
    return "bg-red-300/80 shadow-[0_0_14px_rgba(252,165,165,0.45)]";
  }

  if (item.densityPerSec >= 7) {
    return "bg-amber-300/80 shadow-[0_0_14px_rgba(252,211,77,0.35)]";
  }

  if (item.densityPerSec >= 3) {
    return "bg-emerald-300/80 shadow-[0_0_14px_rgba(110,231,183,0.35)]";
  }

  return "bg-blue-300/70 shadow-[0_0_14px_rgba(147,197,253,0.25)]";
}

function getTimelineBarHeightPercent(
  item: TransientTimelineItem,
  maxDensity: number,
) {
  if (maxDensity <= 0) {
    return 8;
  }

  return Math.max(8, Math.min(100, (item.densityPerSec / maxDensity) * 100));
}

export function TransientsMeterCard({
  attackStrength,
  transientDensityPerSec,
  p95ShortCrestDb,
  meanShortCrestDb,
  transientDensityCv,
  timeline,
}: TransientsMeterCardProps) {
  const attackPercent = getAttackPercent(attackStrength);
  const attackLabel = getAttackLabel(attackPercent);
  const attackColorClass = getAttackColorClass(attackLabel);

  const densityLabel = getDensityLabel(transientDensityPerSec);
  const densityColorClass = getDensityColorClass(densityLabel);

  const crestSpreadDb =
    isValidNumber(p95ShortCrestDb) && isValidNumber(meanShortCrestDb)
      ? p95ShortCrestDb - meanShortCrestDb
      : null;

  const crestSpreadLabel = getCrestSpreadLabel(crestSpreadDb);
  const crestSpreadColorClass = getCrestSpreadColorClass(crestSpreadLabel);

  const stabilityLabel = getStabilityLabel(transientDensityCv);
  const stabilityColorClass = getStabilityColorClass(stabilityLabel);

  const punchProfile = getPunchProfile(
    attackPercent,
    p95ShortCrestDb,
    transientDensityPerSec,
  );
  const punchColorClass = getPunchColorClass(punchProfile);

  const hasCoreValues =
    isValidNumber(attackPercent) ||
    isValidNumber(transientDensityPerSec) ||
    isValidNumber(p95ShortCrestDb) ||
    isValidNumber(meanShortCrestDb) ||
    isValidNumber(transientDensityCv);

  const validTimeline = timeline.filter(
    (item) =>
      isValidNumber(item.startSec) &&
      isValidNumber(item.endSec) &&
      isValidNumber(item.densityPerSec),
  );

  const hasTimeline = validTimeline.length > 0;
  const maxDensity = hasTimeline
    ? Math.max(...validTimeline.map((item) => item.densityPerSec))
    : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl shadow-black/30 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.22em] text-white/40">
            Punch & attack
          </div>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Transients
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            Shows attack strength, transient density and short-window crest
            behavior. This is a technical hint layer, not a final mix judgment.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          {hasCoreValues ? "AVAILABLE" : "NOT AVAILABLE"}
        </div>
      </div>

      {hasCoreValues ? (
        <>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wider text-white/40">
                  Attack Strength
                </div>
                <div className="mt-2 text-3xl font-semibold text-white tabular-nums">
                  {isValidNumber(attackPercent)
                    ? `${Math.round(attackPercent)} / 100`
                    : "—"}
                </div>
              </div>

              <div className={`text-2xl font-semibold ${attackColorClass}`}>
                {attackLabel ?? "—"}
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#00FFC6] shadow-[0_0_12px_rgba(0,255,198,0.6)] transition-all duration-500"
                style={{ width: `${attackPercent ?? 0}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm text-white/45">Transient Density</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-2xl font-semibold text-white tabular-nums">
                  {formatNumber(transientDensityPerSec, 2)}
                </div>
                <div className={`text-xl font-semibold ${densityColorClass}`}>
                  {densityLabel ?? "—"}
                </div>
              </div>
              <div className="mt-1 text-xs text-white/35">events/sec</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm text-white/45">Crest Spread</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-2xl font-semibold text-white tabular-nums">
                  {formatNumber(crestSpreadDb, 2)}
                </div>
                <div
                  className={`text-xl font-semibold ${crestSpreadColorClass}`}
                >
                  {crestSpreadLabel ?? "—"}
                </div>
              </div>
              <div className="mt-1 text-xs text-white/35">
                p95 short crest minus mean short crest
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm text-white/45">Transient Stability</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-2xl font-semibold text-white tabular-nums">
                  {formatNumber(transientDensityCv, 2)}
                </div>
                <div className={`text-xl font-semibold ${stabilityColorClass}`}>
                  {stabilityLabel ?? "—"}
                </div>
              </div>
              <div className="mt-1 text-xs text-white/35">
                density variation across the track
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm text-white/45">Punch Profile</div>
              <div className={`mt-2 text-2xl font-semibold ${punchColorClass}`}>
                {punchProfile ?? "—"}
              </div>
              <div className="mt-1 text-xs text-white/35">
                derived from attack, crest and density
              </div>
            </div>
          </div>

          {hasTimeline ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm uppercase tracking-wider text-white/40">
                  Density timeline
                </div>
                <div className="text-xs text-white/35">
                  {validTimeline.length} windows
                </div>
              </div>

              <div className="mt-4 flex h-36 items-end gap-1 overflow-hidden rounded-xl border border-white/10 bg-black/25 px-2 py-2">
                {validTimeline.map((item) => (
                  <div
                    key={`${item.startSec}-${item.endSec}`}
                    className="group relative flex h-full flex-1 items-end"
                    title={`${formatTimeRange(
                      item.startSec,
                      item.endSec,
                    )} · ${item.transientCount} transients · ${formatNumber(
                      item.densityPerSec,
                      2,
                    )}/sec`}
                  >
                    <div
                      className={`w-full rounded-t-sm ${getTimelineBarClass(
                        item,
                      )}`}
                      style={{
                        height: `${getTimelineBarHeightPercent(
                          item,
                          maxDensity,
                        )}%`,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-2 text-xs leading-5 text-white/35">
                Each bar shows transient density in a local time window.
              </div>
            </div>
          ) : (
            <div className="mt-5 flex h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-sm leading-6 text-white/40">
              Transient timeline is not available yet.
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-sm leading-6 text-white/40">
          Transient data is not available yet. Re-run the local engine so
          analysis.transients is written to analysis.json.
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-white/50">
        <span className="font-medium text-white/70">Current basis:</span>{" "}
        {hasCoreValues
          ? "real onset envelope and short-window crest values from the local engine"
          : "no usable transient values"}
      </div>
    </section>
  );
}
