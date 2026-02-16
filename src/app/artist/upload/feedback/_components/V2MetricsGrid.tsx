"use client";

import { TruePeakHeatbar } from "@/components/ai/TruePeakHeatbar";
import { formatHardFailReason } from "../_lib/feedbackHelpers";
import CodecSimulationPanel from "./CodecSimulationPanel";
import ShortTermLufsChart from "./ShortTermLufsChart";

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

  const headroomSourceDb =
    typeof v2TruePeak === "number" && Number.isFinite(v2TruePeak) ? 0.0 - v2TruePeak : null;

  const headroomSourceBadge =
    headroomSourceDb === null
      ? null
      : headroomSourceDb <= 0
        ? { label: "CRITICAL", badgeClass: "border-red-400/30 bg-red-500/10 text-red-200", valueClass: "text-red-300" }
        : headroomSourceDb <= 0.10
          ? { label: "CRITICAL", badgeClass: "border-red-400/30 bg-red-500/10 text-red-200", valueClass: "text-red-300" }
          : headroomSourceDb <= 0.30
            ? { label: "WARN", badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200", valueClass: "text-yellow-300" }
            : { label: "INFO", badgeClass: "border-white/10 bg-white/5 text-white/60", valueClass: "text-white/50" };

  const lowEndPhaseCorr =
    typeof (payload as any)?.metrics?.low_end?.phase_correlation_20_120 === "number"
      ? (payload as any).metrics.low_end.phase_correlation_20_120
      : null;

  const lowEndMonoLossPct =
    typeof (payload as any)?.metrics?.low_end?.mono_energy_loss_pct_20_120 === "number"
      ? (payload as any).metrics.low_end.mono_energy_loss_pct_20_120
      : null;

  const dynamicsHealth =
    (payload as any)?.dynamics_health && typeof (payload as any).dynamics_health === "object"
      ? (payload as any).dynamics_health
      : null;

  const dynamicsScore =
    dynamicsHealth && typeof dynamicsHealth.score === "number" && Number.isFinite(dynamicsHealth.score)
      ? dynamicsHealth.score
      : null;

  const dynamicsLabel =
    dynamicsHealth && typeof dynamicsHealth.label === "string" ? String(dynamicsHealth.label) : null;

  const dynamicsBadge =
    dynamicsLabel === null
      ? null
      : dynamicsLabel === "over-limited"
        ? { label: "OVER-LIMITED", badgeClass: "border-red-400/30 bg-red-500/10 text-red-200", valueClass: "text-red-300" }
        : dynamicsLabel === "borderline"
          ? { label: "BORDERLINE", badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200", valueClass: "text-yellow-300" }
          : { label: "HEALTHY", badgeClass: "border-white/10 bg-white/5 text-white/60", valueClass: "text-white/50" };

  const dynamicsFactors =
    dynamicsHealth && typeof dynamicsHealth.factors === "object" && dynamicsHealth.factors
      ? dynamicsHealth.factors
      : null;

  const lowEndBadge =
    lowEndPhaseCorr === null && lowEndMonoLossPct === null
      ? null
      : (lowEndPhaseCorr !== null && lowEndPhaseCorr < 0) || (lowEndMonoLossPct !== null && lowEndMonoLossPct > 30)
        ? { label: "CRITICAL", badgeClass: "border-red-400/30 bg-red-500/10 text-red-200", valueClass: "text-red-300" }
        : (lowEndPhaseCorr !== null && lowEndPhaseCorr < 0.2) || (lowEndMonoLossPct !== null && lowEndMonoLossPct > 15)
          ? { label: "HIGH", badgeClass: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200", valueClass: "text-yellow-300" }
          : (lowEndPhaseCorr !== null && lowEndPhaseCorr < 0.5) || (lowEndMonoLossPct !== null && lowEndMonoLossPct > 5)
            ? { label: "WARN", badgeClass: "border-white/10 bg-white/5 text-white/60", valueClass: "text-white/50" }
            : { label: "OK", badgeClass: "border-white/10 bg-white/5 text-white/60", valueClass: "text-white/50" };

  return (
    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
      {/* v2 Highlights (short, human) */}
      {v2Highlights.length > 0 ? (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
          <div className="text-xs text-white/70 mb-2">Highlights</div>
          <ul className="space-y-1">
            {Array.from(
              new Map(
                v2Highlights.map((h) => [String(h).trim().toLowerCase(), String(h).trim()] as const)
              ).values()
            )
              .slice(0, 5)
              .map((h, idx) => (
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

      {(() => {
        const sn = (payload as any)?.metrics?.loudness?.streaming_normalization;
        if (!sn) return null;

        const fmt = (v: any) =>
          typeof v === "number" && Number.isFinite(v)
            ? `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`
            : "—";

        return (
          <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
            <div className="text-xs text-white/70 mb-2">Streaming normalization (estimated)</div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-[11px] text-white/60">Spotify (−14 LUFS)</div>
                <div className="mt-1 text-sm text-white/80">Gain: {fmt(sn.spotify?.applied_gain_db)}</div>
                <div className="text-[11px] text-white/45">Desired: {fmt(sn.spotify?.desired_gain_db)}</div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-[11px] text-white/60">YouTube (−14 LUFS)</div>
                <div className="mt-1 text-sm text-white/80">Gain: {fmt(sn.youtube?.applied_gain_db)}</div>
                <div className="text-[11px] text-white/45">Down-only</div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-[11px] text-white/60">Apple Music (−16 LUFS)</div>
                <div className="mt-1 text-sm text-white/80">Gain: {fmt(sn.apple_music?.applied_gain_db)}</div>
                <div className="text-[11px] text-white/45">
                  Up capped by headroom: {fmt(sn.apple_music?.max_up_gain_db)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {(() => {
        const raw =
          (payload as any)?.metrics?.loudness?.short_term_lufs_timeline ??
          (payload as any)?.metrics?.loudness?.shortTermLufsTimeline ??
          (payload as any)?.metrics?.loudness?.short_term ??
          null;

        const pts = Array.isArray(raw)
          ? raw
              .map((p: any) => ({
                t: typeof p?.t === "number" ? p.t : typeof p?.time_s === "number" ? p.time_s : null,
                lufs: typeof p?.lufs === "number" ? p.lufs : typeof p?.short_term_lufs === "number" ? p.short_term_lufs : null,
              }))
              .filter((p: any) => typeof p.t === "number" && Number.isFinite(p.t) && typeof p.lufs === "number" && Number.isFinite(p.lufs))
          : [];

        if (pts.length < 2) return null;

        return <ShortTermLufsChart points={pts} />;
      })()}

      {(() => {
        const he = (payload as any)?.metrics?.loudness?.headroom_engineering;
        if (!he) return null;

        const fmtDbTp = (v: any) =>
          typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(2)} dBTP` : "—";

        const score =
          typeof he.score_0_100 === "number" && Number.isFinite(he.score_0_100) ? he.score_0_100 : null;

        const badge =
          typeof he.badge === "string" ? he.badge : null;

        const badgeClass =
          badge === "healthy"
            ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"
            : badge === "ok"
              ? "text-white/70 border-white/15 bg-white/5"
              : badge === "warn"
                ? "text-yellow-300 border-yellow-400/30 bg-yellow-500/10"
                : "text-red-300 border-red-400/30 bg-red-500/10";

        const badgeLabel =
          badge === "healthy" ? "HEALTHY" : badge === "ok" ? "OK" : badge === "warn" ? "WARN" : "CRITICAL";

        return (
          <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white/70">Headroom engineering</div>
              <div className="flex items-center gap-2">
                <span className={"text-[10px] px-2 py-0.5 rounded-full border " + badgeClass}>
                  {badgeLabel}
                </span>
                <span className="text-xs text-white/60 tabular-nums">
                  {score === null ? "—" : `${score}/100`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-[11px] text-white/60">Effective headroom</div>
                <div className="mt-1 text-sm text-white/80 tabular-nums">{fmtDbTp(he.effective_headroom_dbtp)}</div>
                <div className="text-[11px] text-white/45">min(source, post-encode)</div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-[11px] text-white/60">Source headroom</div>
                <div className="mt-1 text-sm text-white/80 tabular-nums">{fmtDbTp(he.source_headroom_dbtp)}</div>
                <div className="text-[11px] text-white/45">to 0.0 dBTP</div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-[11px] text-white/60">Post-encode headroom</div>
                <div className="mt-1 text-sm text-white/80 tabular-nums">{fmtDbTp(he.post_encode_headroom_dbtp)}</div>
                <div className="text-[11px] text-white/45">worst-case to 0.0</div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 p-2">
                <div className="text-[11px] text-white/60">Worst post TP</div>
                <div className="mt-1 text-sm text-white/80 tabular-nums">{fmtDbTp(he.worst_post_true_peak_dbtp)}</div>
                <div className="text-[11px] text-white/45">AAC/MP3 max</div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {dynamicsHealth ? (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-white/70">Dynamics Health</span>
              <span className="text-[10px] text-white/40">Technical • No gate</span>
            </div>

            <div className="flex items-center gap-2">
              {dynamicsBadge ? (
                <span className={"text-[10px] px-2 py-0.5 rounded-full border " + dynamicsBadge.badgeClass}>
                  {dynamicsBadge.label}
                </span>
              ) : null}

              <span className={"text-xs tabular-nums " + (dynamicsBadge ? dynamicsBadge.valueClass : "text-white/50")}>
                {dynamicsScore === null ? "—" : `${dynamicsScore}/100`}
              </span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">LUFS</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {dynamicsFactors && typeof (dynamicsFactors as any).lufs === "number"
                  ? (dynamicsFactors as any).lufs.toFixed(1)
                  : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">LRA</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {dynamicsFactors && typeof (dynamicsFactors as any).lra === "number"
                  ? (dynamicsFactors as any).lra.toFixed(1)
                  : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">Crest</span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {dynamicsFactors && typeof (dynamicsFactors as any).crest === "number"
                  ? (dynamicsFactors as any).crest.toFixed(2)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg bg-black/20 p-3 border border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-white/70">Headroom (source)</span>
          <span className="text-[10px] text-white/40">Pre-encode (source)</span>
        </div>

        <div className="flex items-center gap-2">
          {headroomSourceBadge ? (
            <span
              className={
                "text-[10px] px-2 py-0.5 rounded-full border " + headroomSourceBadge.badgeClass
              }
            >
              {headroomSourceBadge.label}
            </span>
          ) : null}

          <span className={"text-xs tabular-nums " + (headroomSourceBadge ? headroomSourceBadge.valueClass : "text-white/50")}>
            {headroomSourceDb === null ? "—" : `${headroomSourceDb.toFixed(2)} dBTP`}
          </span>
        </div>
      </div>

      {/* Phase 2: Streaming Safety (unlock-gated via payload) */}
      <CodecSimulationPanel payload={payload} />

      {/* v2 Events: True Peak Timeline (timecoded) */}
      <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
        <TruePeakHeatbar durationS={v2DurationS} overs={v2TruePeakOvers as any} />
      </div>

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

      {(lowEndPhaseCorr !== null || lowEndMonoLossPct !== null) && (
        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-white/70">Low-End Mono Stability (20–120 Hz)</span>
              <span className="text-[10px] text-white/40">Purely technical • Club translation</span>
            </div>

            {lowEndBadge ? (
              <span className={"text-[10px] px-2 py-0.5 rounded-full border " + lowEndBadge.badgeClass}>
                {lowEndBadge.label}
              </span>
            ) : null}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">Phase correlation (20–120 Hz)</span>
              <span className={"text-[11px] tabular-nums " + (lowEndBadge ? lowEndBadge.valueClass : "text-white/50")}>
                {lowEndPhaseCorr === null ? "—" : lowEndPhaseCorr.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
              <span className="text-[11px] text-white/60">Mono energy loss (20–120 Hz)</span>
              <span className={"text-[11px] tabular-nums " + (lowEndBadge ? lowEndBadge.valueClass : "text-white/50")}>
                {lowEndMonoLossPct === null ? "—" : `${lowEndMonoLossPct.toFixed(1)}%`}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-white/50">
            Tip: High mono loss or negative correlation can make bass disappear on mono club systems.
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
