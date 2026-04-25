import type { AnalysisPayload } from "@/components/decision-center/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function formatMetricValue(value: number | null, unit?: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  const formatted = formatNumber(value, 2);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function TechnicalMetricsRawPanel({
  analysis,
}: {
  analysis: AnalysisPayload | null;
}) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Internal Lab
        </p>
        <h3 className="mt-1 text-sm font-semibold text-white">Technical Metrics Raw</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Technical metrics not available for this track.
        </p>
      </section>
    );
  }

  const loudness = getRecord(analysis.loudness);
  const dynamics = getRecord(analysis.dynamics);
  const stereo = getRecord(analysis.stereo);
  const lowEnd = getRecord(analysis.low_end);

  const renderMetricGrid = (
    rows: Array<{ label: string; value: string }>,
    emptyText: string,
  ) => {
    if (rows.length === 0) {
      return <p className="mt-3 text-sm text-zinc-400">{emptyText}</p>;
    }

    return (
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm text-zinc-200">{row.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Internal Lab
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">Technical Metrics Raw</h3>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Loudness</h4>
          {loudness ? (
            renderMetricGrid(
              [
                {
                  label: "integrated_lufs",
                  value: formatMetricValue(getNumber(loudness.integrated_lufs), "LUFS"),
                },
                {
                  label: "loudness_range_lu",
                  value: formatMetricValue(getNumber(loudness.loudness_range_lu), "LU"),
                },
                {
                  label: "true_peak_dbtp",
                  value: formatMetricValue(getNumber(loudness.true_peak_dbtp), "dBTP"),
                },
                {
                  label: "peak_dbfs",
                  value: formatMetricValue(getNumber(loudness.peak_dbfs), "dBFS"),
                },
                {
                  label: "sample_rate",
                  value: formatMetricValue(getNumber(loudness.sample_rate)),
                },
              ],
              "No loudness data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No loudness data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Dynamics</h4>
          {dynamics ? (
            renderMetricGrid(
              [
                {
                  label: "crest_factor_db",
                  value: formatMetricValue(getNumber(dynamics.crest_factor_db), "dB"),
                },
                {
                  label: "integrated_rms_dbfs",
                  value: formatMetricValue(getNumber(dynamics.integrated_rms_dbfs), "dBFS"),
                },
                {
                  label: "plr_lu",
                  value: formatMetricValue(getNumber(dynamics.plr_lu), "LU"),
                },
              ],
              "No dynamics data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No dynamics data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Stereo</h4>
          {stereo ? (
            renderMetricGrid(
              [
                {
                  label: "side_mid_ratio",
                  value: formatMetricValue(getNumber(stereo.side_mid_ratio)),
                },
                {
                  label: "phase_correlation",
                  value: formatMetricValue(getNumber(stereo.phase_correlation)),
                },
                {
                  label: "stereo_width",
                  value: formatMetricValue(getNumber(stereo.stereo_width)),
                },
                {
                  label: "sample_rate",
                  value: formatMetricValue(getNumber(stereo.sample_rate)),
                },
              ],
              "No stereo data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No stereo data.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <h4 className="text-sm font-semibold text-white">Low End</h4>
          {lowEnd ? (
            renderMetricGrid(
              [
                {
                  label: "mono_loss_low_band_percent",
                  value: formatMetricValue(getNumber(lowEnd.mono_loss_low_band_percent), "%"),
                },
                {
                  label: "phase_correlation_low_band",
                  value: formatMetricValue(getNumber(lowEnd.phase_correlation_low_band)),
                },
                {
                  label: "low_band_balance_db",
                  value: formatMetricValue(getNumber(lowEnd.low_band_balance_db), "dB"),
                },
                {
                  label: "sample_rate",
                  value: formatMetricValue(getNumber(lowEnd.sample_rate)),
                },
              ],
              "No low-end data.",
            )
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No low-end data.</p>
          )}
        </div>
      </div>
    </section>
  );
}
