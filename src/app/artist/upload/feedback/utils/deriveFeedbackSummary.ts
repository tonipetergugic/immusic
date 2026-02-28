import evaluateLimiterStress from "./evaluateLimiterStress";

export type FeedbackIssue = {
  severity: "critical" | "warn" | "good";
  title: string;
  message: string;
  targetId: string;
  source: string;
  rank: number; // internal sort only
};

function sevWeight(s: FeedbackIssue["severity"]): number {
  if (s === "critical") return 3;
  if (s === "warn") return 2;
  return 1; // good
}

function pushIssue(out: FeedbackIssue[], issue: FeedbackIssue) {
  // minimal sanity
  if (!issue.title || !issue.message || !issue.targetId) return;
  out.push(issue);
}

export function deriveFeedbackSummary(params: { payload: any; isReady: boolean }): { clusters: any[] } {
  const { payload, isReady } = params;

  // If not ready, return empty summary (UI can handle)
  if (!isReady || !payload || typeof payload !== "object") {
    return { clusters: [] };
  }

  const issues: FeedbackIssue[] = [];

  // ---------- READ METRICS (defensive) ----------
  const lufsI =
    typeof payload?.metrics?.loudness?.lufs_i === "number" && Number.isFinite(payload.metrics.loudness.lufs_i)
      ? payload.metrics.loudness.lufs_i
      : null;

  const shortTermTimeline =
    Array.isArray(payload?.metrics?.loudness?.short_term_lufs_timeline)
      ? payload.metrics.loudness.short_term_lufs_timeline
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

  const midSideRatio =
    typeof payload?.metrics?.stereo?.mid_side_energy_ratio === "number" &&
    Number.isFinite(payload.metrics.stereo.mid_side_energy_ratio)
      ? payload.metrics.stereo.mid_side_energy_ratio
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
  const TARGET_MID_SIDE = "mid-side";
  const TARGET_TRANSIENTS = "transients-punch";
  const TARGET_DYNAMICS = "engineering-dynamics";
  const TARGET_SHORT_TERM = "short-term-lufs";

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
        severity: "warn",
        title: "Too loud for streaming",
        message: "Master is very hot. Lower gain so streaming services don’t turn it down aggressively.",
        targetId: TARGET_ENGINEERING_CORE,
        source: "EngineeringCore",
        rank: 60,
      });
    } else if (lufsI < -14.0) {
      pushIssue(issues, {
        severity: "warn",
        title: "Very quiet master",
        message: "Overall level is low. Raise the master moderately so it competes better.",
        targetId: TARGET_ENGINEERING_CORE,
        source: "EngineeringCore",
        rank: 40,
      });
    } else {
      // stable candidate
      pushIssue(issues, {
        severity: "good",
        title: "Loudness looks stable",
        message: "No loudness-related upload risk detected.",
        targetId: TARGET_ENGINEERING_CORE,
        source: "EngineeringCore",
        rank: 10,
      });
    }
  }

  // ---------- STREAMING NORMALIZATION (EngineeringCore) ----------
  const sn = payload?.metrics?.loudness?.streaming_normalization ?? null;

  const spGain =
    typeof sn?.spotify?.applied_gain_db === "number" && Number.isFinite(sn.spotify.applied_gain_db)
      ? sn.spotify.applied_gain_db
      : null;

  const ytGain =
    typeof sn?.youtube?.applied_gain_db === "number" && Number.isFinite(sn.youtube.applied_gain_db)
      ? sn.youtube.applied_gain_db
      : null;

  const amGain =
    typeof sn?.apple_music?.applied_gain_db === "number" && Number.isFinite(sn.apple_music.applied_gain_db)
      ? sn.apple_music.applied_gain_db
      : null;

  const spTarget =
    typeof sn?.spotify?.target_lufs_i === "number" && Number.isFinite(sn.spotify.target_lufs_i)
      ? sn.spotify.target_lufs_i
      : null;

  const gains = [spGain, ytGain, amGain].filter(
    (g): g is number => typeof g === "number"
  );

  if (gains.length > 0) {
    const maxDown = Math.min(...gains); // most negative value
    const abs = Math.abs(maxDown);

    const sev: "critical" | "warn" | "good" =
      abs >= 8 ? "warn" : abs >= 4 ? "warn" : "good";

    const message =
      abs >= 4
        ? `Streaming platforms will reduce your level by up to ${abs.toFixed(
            1
          )} dB. Lower master loudness slightly to preserve punch and reduce limiter stress.`
        : `Streaming impact is minor (${abs.toFixed(
            1
          )} dB reduction). No adjustment needed.`;

    pushIssue(issues, {
      severity: sev,
      title: "Streaming normalization",
      message,
      targetId: TARGET_ENGINEERING_CORE,
      source: "EngineeringCore",
      rank: sev === "warn" ? 65 : 12,
    });
  }

  // ---------- LIMITER STRESS ----------
  const limiterEvaluation = evaluateLimiterStress(
    payload?.events?.loudness?.true_peak_overs_details ?? null,
    payload?.metrics?.duration_s ?? null
  );

  pushIssue(issues, {
    severity: limiterEvaluation.tone,
    title: "Limiter Stress",
    message:
      limiterEvaluation.tone === "critical"
        ? "High limiter stress. Lower the master ceiling by ~0.5–1 dB or reduce overall gain before limiting."
        : limiterEvaluation.tone === "warn"
        ? "Limiter is working hard. Slightly reduce master gain to keep transients cleaner."
        : "Limiter behavior is controlled. No adjustment needed.",
    targetId: TARGET_LIMITER_STRESS,
    source: "LimiterStress",
    rank: limiterEvaluation.tone === "critical" ? 90 : limiterEvaluation.tone === "warn" ? 55 : 8,
  });

  // ---------- STEREO & MONO (ACTIONABLE) ----------

  // Low-end mono stability (20–120 Hz)
  if (typeof lePhase20_120 === "number" || typeof leMonoLoss20_120 === "number") {
    const phaseVal = typeof lePhase20_120 === "number" ? lePhase20_120 : null;
    const lossVal = typeof leMonoLoss20_120 === "number" ? leMonoLoss20_120 : null;

    const isWarn =
      (phaseVal !== null && phaseVal < 0.5) ||
      (lossVal !== null && lossVal >= 12);

    pushIssue(issues, {
      severity: isWarn ? "warn" : "good",
      title: isWarn ? "Low-end mono needs tightening" : "Low-end mono is safe",
      message: isWarn
        ? "Collapse everything below ~120 Hz to mono. Remove stereo widening from bass layers."
        : "No adjustment needed.",
      targetId: TARGET_LOW_END_MONO,
      source: "LowEndMonoStability",
      rank: isWarn ? 45 : 7,
    });
  }

  // Phase correlation (global stereo)
  if (typeof phaseCorr === "number") {
    const isCritical = phaseCorr < -0.2;
    const isWarn = phaseCorr < 0;

    pushIssue(issues, {
      severity: isCritical ? "critical" : isWarn ? "warn" : "good",
      title: isCritical
        ? "Stereo phase cancellation risk"
        : isWarn
          ? "Stereo phase is slightly unstable"
          : "Stereo phase is stable",
      message: isCritical
        ? "Reduce stereo widening on leads/pads. Avoid phase-based wideners."
        : isWarn
          ? "Slightly reduce stereo width on wide elements. Check mono playback."
          : "No adjustment needed.",
      targetId: TARGET_PHASE_CORR,
      source: "PhaseCorrelation",
      rank: isCritical ? 80 : isWarn ? 35 : 6,
    });
  }

  // Mid/Side balance (Side/Mid energy ratio)
  if (typeof midSideRatio === "number") {
    const r = midSideRatio;

    const isWarn = r < 0.5 || r > 2;

    pushIssue(issues, {
      severity: isWarn ? "warn" : "good",
      title: isWarn ? "Mix is very wide" : "Mid/Side balance is solid",
      message: isWarn
        ? "Add subtle mid reinforcement. Reduce excessive stereo FX."
        : "No adjustment needed.",
      targetId: TARGET_MID_SIDE,
      source: "MidSide",
      rank: isWarn ? 32 : 6,
    });
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
        severity: "warn",
        title: "Punch could be stronger",
        message: "More attack would help. Enhance transients slightly without clipping.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 30,
      });
    } else {
      pushIssue(issues, {
        severity: "good",
        title: "Punch looks solid",
        message: "Transient impact is structurally sound.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 5,
      });
    }
  }

  if (typeof transientDensity === "number") {
    if (transientDensity > 0.15) {
      pushIssue(issues, {
        severity: "warn",
        title: "Too dense / overfilled",
        message: "Transient density is very high. Clean up the arrangement so the drop stays clear.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 28,
      });
    } else if (transientDensity < 0.07) {
      pushIssue(issues, {
        severity: "warn",
        title: "Too empty",
        message: "Transient density is very low. More groove/detail may increase drive.",
        targetId: TARGET_TRANSIENTS,
        source: "Transients",
        rank: 18,
      });
    }
  }

  // ---------- SHORT-TERM LUFS (MOVEMENT) ----------
  if (Array.isArray(shortTermTimeline) && shortTermTimeline.length > 0) {
    const FLOOR = -28;
    const values = shortTermTimeline
      .map((p: any) => (p && typeof p.lufs === "number" ? p.lufs : null))
      .filter((v: any) => typeof v === "number" && Number.isFinite(v) && v >= FLOOR) as number[];

    if (values.length > 0) {
      const sorted = [...values].sort((a, b) => a - b);

      const percentile = (pp: number) => {
        if (sorted.length === 1) return sorted[0];
        const idx = (sorted.length - 1) * pp;
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        const t = idx - lo;
        return sorted[lo] * (1 - t) + sorted[hi] * t;
      };

      const p05 = percentile(0.05);
      const p95 = percentile(0.95);
      const rangeRobust = p95 - p05;

      // Labels match ShortTermLufsChart thresholds
      const label =
        rangeRobust < 3
          ? "Very Flat"
          : rangeRobust < 6
            ? "Slight Movement"
            : rangeRobust < 9
              ? "Natural Movement"
              : rangeRobust < 13
                ? "Strong Movement"
                : "Very Wide Movement";

      // Conservative severity: WARN only at extremes, otherwise GOOD (no artificial critical)
      if (label === "Very Flat") {
        pushIssue(issues, {
          severity: "warn",
          title: "Dynamics feel flat",
          message: "Short-term loudness movement is very low. Drops may feel less impactful than breaks.",
          targetId: TARGET_SHORT_TERM,
          source: "ShortTermLUFS",
          rank: 32,
        });
      } else if (label === "Very Wide Movement") {
        pushIssue(issues, {
          severity: "warn",
          title: "Dynamics are very wide",
          message: "Very large movement across sections. Make sure quieter parts stay present after normalization.",
          targetId: TARGET_SHORT_TERM,
          source: "ShortTermLUFS",
          rank: 22,
        });
      } else {
        pushIssue(issues, {
          severity: "good",
          title: "Dynamics movement looks healthy",
          message: "Section contrast supports impact and emotional energy.",
          targetId: TARGET_SHORT_TERM,
          source: "ShortTermLUFS",
          rank: 6,
        });
      }
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
        severity: "warn",
        title: "Dynamics can be improved",
        message: "Dynamics could be healthier. Slightly less pressure often sounds more open.",
        targetId: TARGET_DYNAMICS,
        source: "EngineeringDynamics",
        rank: 25,
      });
    } else {
      pushIssue(issues, {
        severity: "good",
        title: "Dynamics look healthy",
        message: "Dynamic range is within a healthy zone.",
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

  const clusters = [
    {
      key: "loudness_streaming",
      title: "Loudness & Streaming",
      framing: "Will your master translate after streaming normalization?",
      sources: ["engineeringcore"],
    },
    {
      key: "limiter_stress",
      title: "Limiter Stress",
      framing: "Is your limiter working safely without crushing punch?",
      sources: ["limiterstress"],
    },
    {
      key: "stereo_mono",
      title: "Stereo & Mono Safety",
      framing: "Does your track translate in club systems and mono playback?",
      sources: ["lowendmonostability", "phasecorrelation", "midside"],
    },
    {
      key: "punch_dynamics",
      title: "Punch & Dynamics",
      framing: "Does your track hit with punch and controlled dynamics?",
      sources: ["transients", "engineeringdynamics", "shorttermlufs"],
    },
    {
      key: "tonal_balance",
      title: "Tonal Balance",
      framing: "Does the tonal balance stay even across different systems?",
      sources: ["spectralrms"],
    },
  ].map((cluster) => {
    const related = issues.filter((i) => {
      const s = typeof i.source === "string" ? i.source.toLowerCase() : "";
      return cluster.sources.includes(s);
    });

    let severity: "good" | "warn" | "critical" = "good";

    if (related.some((r) => r.severity === "critical")) {
      severity = "critical";
    } else if (related.some((r) => r.severity === "warn")) {
      severity = "warn";
    }

    const best =
      related.length > 0
        ? [...related].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))[0]
        : null;

    return {
      key: cluster.key,
      title: cluster.title,
      framing: typeof (cluster as any).framing === "string" ? (cluster as any).framing : "",
      severity,
      message:
        typeof best?.message === "string" && best.message.trim().length > 0
          ? best.message
          : severity === "critical"
            ? "Critical technical risk detected. Fix this before upload."
            : severity === "warn"
              ? "Potential technical issue detected. Consider fixing before upload."
              : "No notable technical risk detected in this area.",
      targetId: typeof best?.targetId === "string" ? best.targetId : "",
      source: cluster.key,
      rank:
        typeof best?.rank === "number"
          ? best.rank
          : severity === "critical"
            ? 90
            : severity === "warn"
              ? 55
              : 8,
      issues: related,
    };
  });

  return { clusters };
}
