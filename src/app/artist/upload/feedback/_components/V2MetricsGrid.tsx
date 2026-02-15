"use client";

import { TruePeakHeatbar } from "@/components/ai/TruePeakHeatbar";
import { formatHardFailReason } from "../_lib/feedbackHelpers";
import CodecSimulationPanel from "./CodecSimulationPanel";

export default function V2MetricsGrid(props: {
  isReady: boolean;
  payload: any;
  v2Highlights: string[];
  v2HardFailTriggered: boolean;
  v2HardFailReasons: any[];
  v2LufsI: number | null;
  v2TruePeak: number | null;
  v2DurationS: number | null;
  v2TruePeakOvers: any[] | null;
  v2PunchIndex: number | null;
  v2P95ShortCrest: number | null;
  v2MeanShortCrest: number | null;
  v2TransientDensity: number | null;
  recommendations: any[];
}) {
  const {
    isReady,
    payload,
    v2Highlights,
    v2HardFailTriggered,
    v2HardFailReasons,
    v2LufsI,
    v2TruePeak,
    v2DurationS,
    v2TruePeakOvers,
    v2PunchIndex,
    v2P95ShortCrest,
    v2MeanShortCrest,
    v2TransientDensity,
    recommendations,
  } = props;

  return (
    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
      {/* v2 Highlights (short, human) */}
      {v2Highlights.length > 0 ? (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
          <div className="text-xs text-white/70 mb-2">Highlights</div>
          <ul className="space-y-1">
            {v2Highlights.slice(0, 5).map((h, idx) => (
              <li key={idx} className="text-xs text-white/60">
                {h}
              </li>
            ))}
          </ul>
          {v2HardFailTriggered && v2HardFailReasons.length > 0 ? (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-white/70 mb-2">Hard-fail reasons</div>
              <ul className="space-y-2">
                {v2HardFailReasons.map((r, i) => {
                  const x = formatHardFailReason(r);
                  return (
                    <li key={i} className="text-xs">
                      <div className="text-white/80 font-medium">{x.title}</div>
                      <div className="text-white/60">{x.detail}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* v2 Loudness (known leaf metrics) */}
      <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
        <span className="text-xs text-white/70">Integrated LUFS</span>
        <span className="text-xs text-white/50 tabular-nums">
          {v2LufsI === null ? "—" : v2LufsI.toFixed(1)}
        </span>
      </div>

      <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
        <span className="text-xs text-white/70">True Peak (dBTP max)</span>
        <span className="text-xs text-white/50 tabular-nums">
          {v2TruePeak === null ? "—" : v2TruePeak.toFixed(2)}
        </span>
      </div>

      {/* Phase 2: Streaming Safety (unlock-gated via payload) */}
      <CodecSimulationPanel payload={payload} />

      {/* v2 Events: True Peak Timeline (timecoded) */}
      {v2TruePeakOvers ? (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
          <TruePeakHeatbar durationS={v2DurationS} overs={v2TruePeakOvers as any} />
        </div>
      ) : null}

      {typeof (payload as any)?.metrics?.dynamics?.crest_factor_db === "number" && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/70">Crest Factor (dB)</span>
          <span className="text-xs text-white/50 tabular-nums">
            {(payload as any).metrics.dynamics.crest_factor_db.toFixed(2)}
          </span>
        </div>
      )}

      {typeof (payload as any)?.metrics?.dynamics?.loudness_range_lu === "number" && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/70">Loudness Range (LRA)</span>
          <span className="text-xs text-white/50 tabular-nums">
            {(payload as any).metrics.dynamics.loudness_range_lu.toFixed(1)} LU
          </span>
        </div>
      )}

      {(v2PunchIndex !== null ||
        v2P95ShortCrest !== null ||
        v2MeanShortCrest !== null ||
        v2TransientDensity !== null) && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">Transients & Punch</span>

            {v2PunchIndex !== null ? (
              <span className="text-xs text-white/50 tabular-nums">
                Punch {v2PunchIndex.toFixed(0)}/100
              </span>
            ) : (
              <span className="text-xs text-white/50 tabular-nums">—</span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">p95 Crest</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {v2P95ShortCrest === null ? "—" : `${v2P95ShortCrest.toFixed(2)} dB`}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">Mean Crest</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {v2MeanShortCrest === null ? "—" : `${v2MeanShortCrest.toFixed(2)} dB`}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5 col-span-2">
              <span className="text-[11px] text-white/60">Transient Density</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {v2TransientDensity === null ? "—" : `${(v2TransientDensity * 100).toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>
      )}

      {typeof (payload as any)?.metrics?.stereo?.phase_correlation === "number" && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/70">Phase Correlation</span>
          <div className="flex items-center gap-2">
            {(payload as any).metrics.stereo.phase_correlation < -0.2 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-400/30 bg-red-500/10 text-red-200">
                CRITICAL
              </span>
            ) : (payload as any).metrics.stereo.phase_correlation < 0 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
                WARN
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                OK
              </span>
            )}

            <span
              className={
                "text-xs tabular-nums " +
                ((payload as any).metrics.stereo.phase_correlation < -0.2
                  ? "text-red-300"
                  : (payload as any).metrics.stereo.phase_correlation < 0
                    ? "text-yellow-300"
                    : "text-white/50")
              }
            >
              {(payload as any).metrics.stereo.phase_correlation.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {typeof (payload as any)?.metrics?.stereo?.stereo_width_index === "number" && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/70">Stereo Width Index</span>
          <div className="flex items-center gap-2">
            {(payload as any).metrics.stereo.stereo_width_index > 0.6 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
                WARN
              </span>
            ) : (payload as any).metrics.stereo.stereo_width_index < 0.05 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                INFO
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                OK
              </span>
            )}

            <span className="text-xs tabular-nums text-white/50">
              {(payload as any).metrics.stereo.stereo_width_index.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {(typeof (payload as any)?.metrics?.stereo?.mid_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.stereo?.side_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.stereo?.mid_side_energy_ratio === "number") && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">Mid/Side</span>
            {typeof (payload as any)?.metrics?.stereo?.mid_side_energy_ratio === "number" ? (
              <span className="flex items-center gap-2 text-xs tabular-nums">
                {(payload as any).metrics.stereo.mid_side_energy_ratio > 1.0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
                    WARN
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                    OK
                  </span>
                )}
                <span className="text-white/50">
                  Ratio {(payload as any).metrics.stereo.mid_side_energy_ratio.toFixed(2)}
                </span>
              </span>
            ) : (
              <span className="text-xs text-white/50 tabular-nums">—</span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">Mid RMS</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {typeof (payload as any)?.metrics?.stereo?.mid_rms_dbfs === "number"
                  ? `${(payload as any).metrics.stereo.mid_rms_dbfs.toFixed(1)} dBFS`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">Side RMS</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {typeof (payload as any)?.metrics?.stereo?.side_rms_dbfs === "number"
                  ? `${(payload as any).metrics.stereo.side_rms_dbfs.toFixed(1)} dBFS`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {(typeof (payload as any)?.metrics?.spectral?.sub_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.spectral?.low_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.spectral?.lowmid_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.spectral?.mid_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.spectral?.highmid_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.spectral?.high_rms_dbfs === "number" ||
        typeof (payload as any)?.metrics?.spectral?.air_rms_dbfs === "number") && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <div className="text-xs text-white/70 mb-2">Spectral (RMS by band)</div>

          <div className="grid grid-cols-2 gap-2">
            {([
              ["Sub", (payload as any).metrics.spectral.sub_rms_dbfs],
              ["Low", (payload as any).metrics.spectral.low_rms_dbfs],
              ["Low-Mid", (payload as any).metrics.spectral.lowmid_rms_dbfs],
              ["Mid", (payload as any).metrics.spectral.mid_rms_dbfs],
              ["High-Mid", (payload as any).metrics.spectral.highmid_rms_dbfs],
              ["High", (payload as any).metrics.spectral.high_rms_dbfs],
              ["Air", (payload as any).metrics.spectral.air_rms_dbfs],
            ] as Array<[string, any]>)
              .filter(([, v]) => typeof v === "number")
              .map(([label, v]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5"
                >
                  <span className="text-[11px] text-white/60">{label}</span>
                  <span className="text-[11px] text-white/50 tabular-nums">
                    {v.toFixed(1)} dBFS
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {typeof (payload as any)?.metrics?.clipping?.clipped_sample_count === "number" && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/70">Clipping</span>
          <span className="text-xs text-white/50 tabular-nums">
            {(payload as any).metrics.clipping.clipped_sample_count === 0
              ? "No clipping detected"
              : `${(payload as any).metrics.clipping.clipped_sample_count} clipped samples`}
          </span>
        </div>
      )}

      {recommendations?.some((r: any) => r?.id === "rec_placeholder_v2_mvp") ? (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <p className="text-xs text-white/50">
            More technical modules coming next (spectral, stereo, dynamics, transients).
          </p>
        </div>
      ) : null}
    </div>
  );
}
