export type FeedbackIssue = {
  severity: "critical" | "improvement" | "stable";
  title: string;
  message: string;
  targetId: string;
  source: string;
  rank: number; // internal sort only
};

type Summary = {
  critical: FeedbackIssue[];
  improvements: FeedbackIssue[];
  stable: FeedbackIssue[];
};

function sevWeight(s: FeedbackIssue["severity"]): number {
  if (s === "critical") return 3;
  if (s === "improvement") return 2;
  return 1;
}

function pushIssue(out: FeedbackIssue[], issue: FeedbackIssue) {
  // minimal sanity
  if (!issue.title || !issue.message || !issue.targetId) return;
  out.push(issue);
}

export function deriveFeedbackSummary(params: { payload: any; isReady: boolean }): Summary {
  const { payload, isReady } = params;

  // If not ready, return empty summary (UI can handle)
  if (!isReady || !payload || typeof payload !== "object") {
    return { critical: [], improvements: [], stable: [] };
  }

  const issues: FeedbackIssue[] = [];

  // ---------- READ METRICS (defensive) ----------
  const lufsI =
    typeof payload?.metrics?.loudness?.lufs_i === "number" && Number.isFinite(payload.metrics.loudness.lufs_i)
      ? payload.metrics.loudness.lufs_i
      : null;

  const truePeakMax =
    typeof payload?.metrics?.loudness?.true_peak_dbtp_max === "number" &&
    Number.isFinite(payload.metrics.loudness.true_peak_dbtp_max)
      ? payload.metrics.loudness.true_peak_dbtp_max
      : null;

  const truePeakOvers =
    typeof payload?.events?.loudness?.true_peak_overs === "number" && Number.isFinite(payload.events.loudness.true_peak_overs)
      ? payload.events.loudness.true_peak_overs
      : null;

  const lePhase20_120 =
    typeof payload?.metrics?.low_end?.phase_correlation_20_120 === "number" &&
    Number.isFinite(payload.metrics.low_end.phase_correlation_20_120)
      ? payload.metrics.low_end.phase_correlation_20_120
      : null;

  const leMonoLoss20_120 =
    typeof payload?.metrics?.low_end?.mono_energy_loss_pct_20_120 === "number" &&
    Number.isFinite(payload.metrics.low_end.mono_energy_loss_pct_20_120)
      ? payload.metrics.low_end.mono_energy_loss_pct_20_120
      : null;

  const phaseCorr =
    typeof payload?.metrics?.stereo?.phase_correlation === "number" && Number.isFinite(payload.metrics.stereo.phase_correlation)
      ? payload.metrics.stereo.phase_correlation
      : null;

  const attackStrength =
    typeof payload?.metrics?.transients?.attack_strength_0_100 === "number" &&
    Number.isFinite(payload.metrics.transients.attack_strength_0_100)
      ? payload.metrics.transients.attack_strength_0_100
      : null;

  const transientDensity =
    typeof payload?.metrics?.transients?.transient_density === "number" &&
    Number.isFinite(payload.metrics.transients.transient_density)
      ? payload.metrics.transients.transient_density
      : null;

  const dynamicsLabel =
    typeof payload?.dynamics_health?.label === "string" ? String(payload.dynamics_health.label).toUpperCase() : null;

  const dynamicsScore =
    typeof payload?.dynamics_health?.score === "number" && Number.isFinite(payload.dynamics_health.score)
      ? payload.dynamics_health.score
      : null;

  // ---------- TARGET IDS (for scroll later) ----------
  const TARGET_ENGINEERING_CORE = "engineering-core";
  const TARGET_LIMITER_STRESS = "limiter-stress";
  const TARGET_LOW_END_MONO = "low-end-mono";
  const TARGET_PHASE_CORR = "phase-correlation";
  const TARGET_TRANSIENTS = "transients-punch";
  const TARGET_DYNAMICS = "engineering-dynamics";

  // ---------- LOUDNESS (EngineeringCore) ----------
  if (typeof truePeakMax === "number") {
    if (truePeakMax >= 0.0) {
      pushIssue(issues, {
        severity: "critical",
        title: "Clipping risk",
        message: "True Peak is too high. Reduce pre-gain or limiter ceiling to avoid clipping.",
        targetId: TARGET_ENGINEERING_CORE,
        source: "EngineeringCore",
        rank: 100,
      });
    }
  }

  if (typeof lufsI === "number") {
    if (lufsI > -7.0) {
      pushIssue(issues, {
        severity: "improvement",
        title: "Too loud for streaming",
        message: "Master is very hot. Lower gain so streaming services don’t turn it down aggressively.",
        targetId: TARGET_ENGINEERING_CORE,
        source: "EngineeringCore",
        rank: 60,
      });
    } else if (lufsI < -14.0) {
      pushIssue(issues, {
        severity: "improvement",
        title: "Very quiet master",
        message: "Overall level is low. Raise the master moderately so it competes better.",
        targetId: TARGET_ENGINEERING_CORE,
        source: "EngineeringCore",
        rank: 40,
      });
    } else {
      // stable candidate
      pushIssue(issues, {
        severity: "stable",
        title: "Loudness looks stable",
        message: "Overall loudness looks reasonable for streaming playback.",
        targetId: TARGET_ENGINEING_CORE,
        source: "EngineeringCore",
        rank: 10,
      });
    }
  }

  // ---------- LIMITER STRESS ----------
  if (typeof truePeakOvers === "number") {
    if (truePeakOvers >= 30) {
      pushIssue(issues, {
        severity: "critical",
        title: "Limiter is overloaded",
        message: "Limiter is hitting constantly. Reduce input level or relax limiting to avoid pumping.",
        targetId: TARGET_LIMITER_STRESS,
        source: "LimiterStress",
        rank: 90,
      });
    } else if (truePeakOvers >= 10) {
      pushIssue(issues, {
        severity: "improvement",
        title: "Limiter under pressure",
        message: "Limiter is working often. More headroom can make the drop cleaner.",
        targetId: TARGET_LIMITER_STRESS,
        source: "LimiterStress",
        rank: 55,
      });
    } else {
      pushIssue(issues, {
        severity: "stable",
        title: "Limiter stress looks fine",
        message: "Limiter stress appears low and controlled.",
        targetId: TARGET_LIMITER_STRESS,
        source: "LimiterStress",
        rank: 8,
      });
    }
  }

  // ---------- MONO (ONLY ONE issue max) ----------
  const monoCandidates: FeedbackIssue[] = [];

  // Low-end mono stability
  if (typeof lePhase20_120 === "number" || typeof leMonoLoss20_120 === "number") {
    const phaseVal = typeof lePhase20_120 === "number" ? lePhase20_120 : null;
    const lossVal = typeof leMonoLoss20_120 === "number" ? leMonoLoss20_120 : null;

    const isCritical = (phaseVal !== null && phaseVal < 0.2) || (lossVal !== null && lossVal >= 25);
    const isImprove = (phaseVal !== null && phaseVal < 0.5) || (lossVal !== null && lossVal >= 12);

    if (isCritical) {
      monoCandidates.push({
        severity: "critical",
        title: "Low-end collapses in mono",
        message: "Sub/low-end loses stability in mono. Center the bass and reduce low-end stereo width up to ~120 Hz.",
        targetId: TARGET_LOW_END_MONO,
        source: "LowEndMonoStability",
        rank: 85,
      });
    } else if (isImprove) {
      monoCandidates.push({
        severity: "improvement",
        title: "Mono stability needs work",
        message: "Low-end mono stability can be improved. Keep the sub more centered and reduce side-bass.",
        targetId: TARGET_LOW_END_MONO,
        source: "LowEndMonoStability",
        rank: 45,
      });
    } else {
      monoCandidates.push({
        severity: "stable",
        title: "Mono stability looks clean",
        message: "Low-end mono stability looks healthy.",
        targetId: TARGET_LOW_END_MONO,
        source: "LowEndMonoStability",
        rank: 7,
      });
    }
  }

  // Stereo phase correlation (global)
  if (typeof phaseCorr === "number") {
    if (phaseCorr < 0.1) {
      monoCandidates.push({
        severity: "critical",
        title: "Phase issues in stereo",
        message: "Stereo feels phasey. Check wide layers/FX or it may disappear in mono.",
        targetId: TARGET_PHASE_CORR,
        source: "PhaseCorrelation",
        rank: 80,
      });
    } else if (phaseCorr < 0.35) {
      monoCandidates.push({
        severity: "improvement",
        title: "Stereo phase is unstable",
        message: "Stereo phase is a bit unstable. Align wide elements for better mono compatibility.",
        targetId: TARGET_PHASE_CORR,
        source: "PhaseCorrelation",
        rank: 35,
      });
    } else {
      monoCandidates.push({
        severity: "stable",
        title: "Phase correlation looks fine",
        message: "Stereo phase correlation looks stable.",
        targetId: TARGET_PHASE_CORR,
        source: "PhaseCorrelation",
        rank: 6,
      });
    }
  }

  if (monoCandidates.length > 0) {
    monoCandidates.sort((a, b) => {
      const sw = sevWeight(b.severity) - sevWeight(a.severity);
      if (sw !== 0) return sw;
      return b.rank - a.rank;
    });
    // pick strongest mono-related issue
    issues.push(monoCandidates[0]);
  }

  // ---------- PUNCH / TRANSIENTS ----------
  if (typeof attackStrength === "number") {
    if (attackStrength < 25) {
      pushIssue(issues, {
        severity: "critical",
        title: "Not enough punch",
        message: "Attack is too weak. Sharpen kick/bass transients (envelopes, layering, transient shaping).",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 75,
      });
    } else if (attackStrength < 40) {
      pushIssue(issues, {
        severity: "improvement",
        title: "Punch could be stronger",
        message: "More attack would help. Enhance transients slightly without clipping.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 30,
      });
    } else {
      pushIssue(issues, {
        severity: "stable",
        title: "Punch looks solid",
        message: "Attack/punch looks generally solid.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 5,
      });
    }
  }

  if (typeof transientDensity === "number") {
    if (transientDensity > 0.15) {
      pushIssue(issues, {
        severity: "improvement",
        title: "Too dense / overfilled",
        message: "Transient density is very high. Clean up the arrangement so the drop stays clear.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 28,
      });
    } else if (transientDensity < 0.07) {
      pushIssue(issues, {
        severity: "improvement",
        title: "Too empty",
        message: "Transient density is very low. More groove/detail may increase drive.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 18,
      });
    }
  }

  // ---------- DYNAMICS HEALTH ----------
  if (dynamicsLabel || typeof dynamicsScore === "number") {
    const isCritical = dynamicsLabel === "CRITICAL" || (typeof dynamicsScore === "number" && dynamicsScore <= 35);
    const isWarn = dynamicsLabel === "WARN" || (typeof dynamicsScore === "number" && dynamicsScore <= 60);

    if (isCritical) {
      pushIssue(issues, {
        severity: "critical",
        title: "Dynamics are unhealthy",
        message: "Dynamics feel crushed. Reduce compression/limiting and add more headroom.",
        targetId: TARGET_DYNAMICS,
        source: "EngineeringDynamics",
        rank: 70,
      });
    } else if (isWarn) {
      pushIssue(issues, {
        severity: "improvement",
        title: "Dynamics can be improved",
        message: "Dynamics could be healthier. Slightly less pressure often sounds more open.",
        targetId: TARGET_DYNAMICS,
        source: "EngineeringDynamics",
        rank: 25,
      });
    } else {
      pushIssue(issues, {
        severity: "stable",
        title: "Dynamics look healthy",
        message: "Dynamics look generally healthy.",
        targetId: TARGET_DYNAMICS,
        source: "EngineeringDynamics",
        rank: 4,
      });
    }
  }

  // ---------- FINAL SORT + LIMITS ----------
  issues.sort((a, b) => {
    const sw = sevWeight(b.severity) - sevWeight(a.severity);
    if (sw !== 0) return sw;
    return b.rank - a.rank;
  });

  const critical = issues.filter((x) => x.severity === "critical").slice(0, 3);
  const improvements = issues.filter((x) => x.severity === "improvement").slice(0, 4);

  // stable only if no critical
  const stable =
    critical.length === 0 ? issues.filter((x) => x.severity === "stable").slice(0, 3) : [];

  return { critical, improvements, stable };
}
