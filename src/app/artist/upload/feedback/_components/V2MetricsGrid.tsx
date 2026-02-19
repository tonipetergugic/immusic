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

  const structure = (payload as any)?.metrics?.structure ?? null;

  const stabilization =
    structure && typeof (structure as any).stabilization === "object" ? (structure as any).stabilization : null;

  const stabBefore =
    stabilization && typeof stabilization.ranges_before === "number" && Number.isFinite(stabilization.ranges_before)
      ? stabilization.ranges_before
      : null;

  const stabAfterStabilize =
    stabilization &&
    typeof stabilization.ranges_after_stabilize === "number" &&
    Number.isFinite(stabilization.ranges_after_stabilize)
      ? stabilization.ranges_after_stabilize
      : null;

  const stabAfterSequence =
    stabilization &&
    typeof stabilization.ranges_after_sequence === "number" &&
    Number.isFinite(stabilization.ranges_after_sequence)
      ? stabilization.ranges_after_sequence
      : null;

  const stabMerges =
    stabilization && typeof stabilization.merges_estimated === "number" && Number.isFinite(stabilization.merges_estimated)
      ? stabilization.merges_estimated
      : null;

  const arrangementDensity =
    structure && typeof structure.arrangement_density === "object"
      ? structure.arrangement_density
      : null;

  const densityLabel =
    arrangementDensity && typeof arrangementDensity.label === "string"
      ? arrangementDensity.label
      : null;

  const densityScore =
    arrangementDensity &&
    typeof arrangementDensity.score_0_100 === "number" &&
    Number.isFinite(arrangementDensity.score_0_100)
      ? arrangementDensity.score_0_100
      : null;

  const structureBadgeForDensity = (label: string | null) => {
    if (!label)
      return { label: "—", badgeClass: "border-white/10 bg-white/5 text-white/60" };

    const map: Record<string, { label: string; badgeClass: string }> = {
      balanced: {
        label: "BALANCED",
        badgeClass: "border-white/10 bg-white/5 text-white/70",
      },
      overfilled: {
        label: "OVERFILLED",
        badgeClass: "border-red-400/30 bg-red-500/10 text-red-200",
      },
      sparse: {
        label: "SPARSE",
        badgeClass: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      },
      too_sparse: {
        label: "SPARSE",
        badgeClass: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      },
    };

    return map[label] ?? {
      label: label.toUpperCase(),
      badgeClass: "border-white/10 bg-white/5 text-white/60",
    };
  };

  const arc = structure && typeof structure.arc === "object" ? structure.arc : null;

  const balance = structure && typeof (structure as any).balance === "object" ? (structure as any).balance : null;

  const hook = structure && typeof (structure as any).hook === "object" ? (structure as any).hook : null;

  const hookDetected = hook && typeof hook.detected === "boolean" ? hook.detected : null;

  const hookConfidence =
    hook && typeof hook.confidence_0_100 === "number" && Number.isFinite(hook.confidence_0_100)
      ? hook.confidence_0_100
      : null;

  const hookOccurrencesCount = Array.isArray(hook?.occurrences) ? hook.occurrences.length : null;

  const hookWindowLen =
    hook &&
    typeof hook.features === "object" &&
    hook.features &&
    typeof hook.features.window_len_s === "number" &&
    Number.isFinite(hook.features.window_len_s)
      ? hook.features.window_len_s
      : null;

  const balanceScore =
    balance && typeof balance.score_0_100 === "number" && Number.isFinite(balance.score_0_100)
      ? balance.score_0_100
      : null;

  const balanceDominant =
    balance && typeof balance.dominant_section === "string" ? String(balance.dominant_section) : null;

  const arcLabel = arc && typeof arc.label === "string" ? String(arc.label) : null;
  const arcConfidence =
    arc && typeof arc.confidence_0_100 === "number" && Number.isFinite(arc.confidence_0_100)
      ? arc.confidence_0_100
      : null;

  const dropItems = Array.isArray(structure?.drop_confidence?.items) ? structure.drop_confidence.items : [];
  const bestDrop =
    dropItems.length > 0
      ? [...dropItems]
          .filter((x: any) => x && typeof x.t === "number" && Number.isFinite(x.t))
          .sort((a: any, b: any) => (Number(b.confidence_0_100) || 0) - (Number(a.confidence_0_100) || 0))[0]
      : null;

  const bestDropLabel = bestDrop && typeof bestDrop.label === "string" ? String(bestDrop.label) : null;
  const bestDropConfidence =
    bestDrop && typeof bestDrop.confidence_0_100 === "number" && Number.isFinite(bestDrop.confidence_0_100)
      ? bestDrop.confidence_0_100
      : null;

  const primaryPeakT =
    structure?.primary_peak && typeof structure.primary_peak.t === "number" && Number.isFinite(structure.primary_peak.t)
      ? structure.primary_peak.t
      : null;

  const fmtTime = (s: number | null) => {
    if (s === null) return "—";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s - m * 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const fmtPct = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);

  const prettyLabel = (x: string | null) =>
    x === null ? "—" : x.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const structureBadgeForArc = (label: string | null) => {
    if (!label) return { label: "—", badgeClass: "border-white/10 bg-white/5 text-white/60" };

    // UI-only mapping: same underlying analysis, friendlier wording for artists
    const map: Record<string, string> = {
      rising_arc: "Rising arc",
      plateau: "Plateau",
      late_drop: "Late drop",
      early_peak: "Early peak",
      energy_collapse: "Energy drop-off",
      multi_peak_arc: "Multi-peak arc",
      chaotic_distribution: "Multi-peak arc",
    };

    const mapped = map[label] ?? prettyLabel(label);
    return { label: mapped, badgeClass: "border-white/10 bg-white/5 text-white/60" };
  };

  const structureBadgeForDrop = (label: string | null) => {
    if (!label) return { label: "—", badgeClass: "border-white/10 bg-white/5 text-white/60" };
    const map: Record<string, { label: string; badgeClass: string }> = {
      // Neutral wording: expresses separation from build-up, not quality
      weak_drop: { label: "LOW SEPARATION", badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-200" },
      solid_drop: { label: "CLEAR SEPARATION", badgeClass: "border-white/10 bg-white/5 text-white/70" },
      high_impact_drop: { label: "STRONG SEPARATION", badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" },
      insufficient_data: { label: "INSUFFICIENT DATA", badgeClass: "border-white/10 bg-white/5 text-white/60" },
    };
    return map[label] ?? { label: prettyLabel(label), badgeClass: "border-white/10 bg-white/5 text-white/60" };
  };

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
      {/* Structure (Phase 3) */}
      {structure ? (
        <div className="rounded-lg bg-black/20 p-4 border border-white/10 md:col-span-2 xl:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <span className="text-xs text-white/70">Structure (Phase 3)</span>
              <span className="text-[10px] text-white/40">Pattern-based • No taste • No gate</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/70">Energy flow</div>
                <span
                  className={
                    "text-[11px] px-2 py-0.5 rounded-full border " +
                    structureBadgeForArc(arcLabel).badgeClass
                  }
                >
                  {structureBadgeForArc(arcLabel).label}
                </span>
              </div>

              <div className="mt-2 text-sm text-white">
                Structural clarity: {fmtPct(arcConfidence)}
              </div>

              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-white/10">
                <div
                  className="h-full bg-white/35"
                  style={{ width: `${Math.max(0, Math.min(100, arcConfidence ?? 0))}%` }}
                />
              </div>

              <div className="mt-2 text-[12px] text-white/50">
                Shows how clearly the track builds and releases energy over time.
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/70">Drop impact</div>
                <span
                  className={
                    "text-[11px] px-2 py-0.5 rounded-full border " +
                    structureBadgeForDrop(bestDropLabel).badgeClass
                  }
                >
                  {structureBadgeForDrop(bestDropLabel).label}
                </span>
              </div>

              <div className="mt-2 text-sm text-white">
                Impact confidence: {fmtPct(bestDropConfidence)}
              </div>

              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-white/10">
                <div
                  className="h-full bg-white/35"
                  style={{ width: `${Math.max(0, Math.min(100, bestDropConfidence ?? 0))}%` }}
                />
              </div>

              <div className="mt-2 text-[12px] text-white/50">
                Indicates how clearly the drop separates itself from the build-up.
              </div>
            </div>
            {balance ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/70">Structure balance</div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
                    {balanceDominant ? `DOMINANT: ${balanceDominant.replaceAll("_", " ").toUpperCase()}` : "STRUCTURE BALANCE"}
                  </span>
                </div>

                <div className="mt-2 text-sm text-white">
                  Balance score: {balanceScore === null ? "—" : `${Math.round(balanceScore)}/100`}
                </div>

                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-white/10">
                  <div
                    className="h-full bg-white/35"
                    style={{ width: `${Math.max(0, Math.min(100, balanceScore ?? 0))}%` }}
                  />
                </div>

                {balanceDominant ? (
                  <div className="mt-2 text-[12px] text-white/55">
                    Dominant section: {balanceDominant.replaceAll("_", " ")}
                  </div>
                ) : null}

                {typeof (balance as any)?.features?.covered_s === "number" &&
                typeof (balance as any)?.features?.duration_s === "number" &&
                Number.isFinite((balance as any).features.covered_s) &&
                Number.isFinite((balance as any).features.duration_s) ? (
                  <div className="mt-1 text-[12px] text-white/45">
                    Coverage: {Math.round(((balance as any).features.covered_s / (balance as any).features.duration_s) * 100)}%
                  </div>
                ) : null}

                <div className="mt-2 text-[12px] text-white/50">
                  Shows how evenly sections are distributed over the timeline (non-judgmental).
                </div>
              </div>
            ) : null}
            {/* Arrangement density */}
            {arrangementDensity ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/70">Arrangement density</div>
                  <span
                    className={
                      "text-[11px] px-2 py-0.5 rounded-full border " +
                      structureBadgeForDensity(densityLabel).badgeClass
                    }
                  >
                    {structureBadgeForDensity(densityLabel).label}
                  </span>
                </div>

                <div className="mt-2 text-sm text-white">
                  Density score: {densityScore !== null ? `${Math.round(densityScore)} / 100` : "—"}
                </div>

                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-white/10">
                  <div
                    className="h-full bg-white/35"
                    style={{ width: `${Math.max(0, Math.min(100, densityScore ?? 0))}%` }}
                  />
                </div>

                <div className="mt-2 text-[12px] text-white/50">
                  Indicates whether the arrangement feels structurally dense, sparse, or balanced.
                </div>
              </div>
            ) : null}
            {hook ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/70">Hook detection</div>
                  <span
                    className={
                      "text-[11px] px-2 py-0.5 rounded-full border " +
                      (hookDetected === true
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        : hookDetected === false
                          ? "border-white/10 bg-white/5 text-white/60"
                          : "border-white/10 bg-white/5 text-white/60")
                    }
                  >
                    {hookDetected === true ? "DETECTED" : hookDetected === false ? "NOT DETECTED" : "—"}
                  </span>
                </div>

                <div className="mt-2 text-sm text-white">
                  Confidence: {hookConfidence === null ? "—" : `${Math.round(hookConfidence)}%`}
                </div>

                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-white/10">
                  <div
                    className="h-full bg-white/35"
                    style={{ width: `${Math.max(0, Math.min(100, hookConfidence ?? 0))}%` }}
                  />
                </div>

                <div className="mt-2 text-[12px] text-white/55">
                  Occurrences: {hookOccurrencesCount === null ? "—" : hookOccurrencesCount}
                  {hookWindowLen !== null ? ` • Window: ${Math.round(hookWindowLen)}s` : ""}
                </div>

                <div className="mt-2 text-[12px] text-white/50">
                  Detects repeated energy patterns across time windows (non-judgmental).
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-2 text-[11px] text-white/50">
            Tip: A high-impact drop means the drop stands out clearly from the build-up. This is a structural measurement, not a judgment of your music.
          </div>
          {stabBefore !== null && stabAfterSequence !== null ? (
            <div className="mt-1 text-[11px] text-white/40">
              Stabilization: {stabBefore} → {stabAfterSequence}
              {stabMerges !== null ? ` (merges: ${stabMerges})` : ""}
              {stabAfterStabilize !== null ? ` • after stabilize: ${stabAfterStabilize}` : ""}
            </div>
          ) : null}
        </div>
      ) : null}

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

      {/* Structure panel moved to top */}

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
