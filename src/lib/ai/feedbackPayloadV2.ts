export type FeedbackEventV2 = {
  t0: number;
  t1: number;
  severity: "info" | "warn" | "critical";
  message: string;
  value?: number;
  unit?: string;
  context?: Record<string, unknown>;
};

export type FeedbackRecommendationV2 = {
  id: string;
  severity: "info" | "warn" | "critical";
  title: string;
  why: string;
  how: string[];
  refs?: Array<{ module: string; event_list: string; index: number }>;
};

export type FeedbackPayloadV2 = {
  schema_version: 2;
  generated_at: string;
  analyzer: {
    engine: "immusic-dsp";
    engine_version: string;
    profile: "feedback_v1";
  };
  track: {
    track_id: string | null;
    queue_id: string;
    audio_hash_sha256: string;
    duration_s: number | null;
    sample_rate_hz: number | null;
    channels: number | null;
  };
  summary: {
    status: "ok";
    severity: "info" | "warn" | "critical";
    highlights: string[];
  };
  hard_fail: {
    triggered: boolean;
    reasons: Array<{
      id: string;
      metric?: string;
      threshold?: number;
      value?: number;
    }>;
  };
  metrics: {
    loudness: {
      lufs_i: number | null;
      true_peak_dbtp_max: number | null;
    };
    spectral: Record<string, unknown>;
    stereo: Record<string, unknown>;
    clipping: Record<string, unknown>;
    dynamics: Record<string, unknown>;
    silence: Record<string, unknown>;
    transients: Record<string, unknown>;
  };
  events: {
    loudness: { true_peak_overs: FeedbackEventV2[] };
    spectral: Record<string, FeedbackEventV2[]>;
    stereo: Record<string, FeedbackEventV2[]>;
    clipping: Record<string, FeedbackEventV2[]>;
    dynamics: Record<string, FeedbackEventV2[]>;
    silence: Record<string, FeedbackEventV2[]>;
    transients: Record<string, FeedbackEventV2[]>;
  };
  recommendations: FeedbackRecommendationV2[];
  // Phase 2 (additiv, unlock-gated via payload writer):
  // Streaming/Codec simulation metrics (encode->decode->analyze).
  codec_simulation?: {
    pre_true_peak_db: number | null;
    aac128: {
      post_true_peak_db: number | null;
      overs_count: number | null;
      headroom_delta_db: number | null;
      distortion_risk: "low" | "moderate" | "high" | null;
    } | null;
    mp3128: {
      post_true_peak_db: number | null;
      overs_count: number | null;
      headroom_delta_db: number | null;
      distortion_risk: "low" | "moderate" | "high" | null;
    } | null;
  } | null;
  debug: null;
};

function headroomHealthFromCodecSim(codecSim: any): { highlight: string; severity: "info" | "warn" | "critical" } | null {
  if (!codecSim) return null;

  const pre = typeof codecSim?.pre_true_peak_db === "number" && Number.isFinite(codecSim.pre_true_peak_db)
    ? codecSim.pre_true_peak_db
    : null;

  const aacPost = typeof codecSim?.aac128?.post_true_peak_db === "number" && Number.isFinite(codecSim.aac128.post_true_peak_db)
    ? codecSim.aac128.post_true_peak_db
    : null;

  const mp3Post = typeof codecSim?.mp3128?.post_true_peak_db === "number" && Number.isFinite(codecSim.mp3128.post_true_peak_db)
    ? codecSim.mp3128.post_true_peak_db
    : null;

  if (pre === null || (aacPost === null && mp3Post === null)) return null;

  // Worst-case post-encode true peak (closest to +infinity)
  const worstPost = Math.max(
    aacPost === null ? -999 : aacPost,
    mp3Post === null ? -999 : mp3Post
  );

  // Headroom to 0.0 dBTP AFTER encoding (positive means still below 0.0)
  const headroomToZero = 0.0 - worstPost;

  // Deterministic thresholds (purely technical):
  // - <= 0.00 dBTP: already over -> critical
  // - <= 0.10 dBTP: extremely tight -> critical
  // - <= 0.30 dBTP: tight -> warn
  // - else: info
  if (headroomToZero <= 0) {
    return {
      severity: "critical",
      highlight: `Streaming headroom (post-encode) is negative (${headroomToZero.toFixed(3)} dBTP): worst-case True Peak ${worstPost.toFixed(3)} dBTP — high risk of audible distortion.`,
    };
  }

  if (headroomToZero <= 0.10) {
    return {
      severity: "critical",
      highlight: `Only ${headroomToZero.toFixed(2)} dBTP streaming headroom (post-encode) — high encoding risk (worst-case True Peak ${worstPost.toFixed(3)} dBTP).`,
    };
  }

  if (headroomToZero <= 0.30) {
    return {
      severity: "warn",
      highlight: `Low streaming headroom (post-encode): ${headroomToZero.toFixed(2)} dBTP — may clip on some platforms (worst-case True Peak ${worstPost.toFixed(3)} dBTP).`,
    };
  }

  return {
    severity: "info",
    highlight: `Streaming headroom (post-encode) looks healthy: ${headroomToZero.toFixed(2)} dBTP (worst-case True Peak ${worstPost.toFixed(3)} dBTP).`,
  };
}

export function buildFeedbackPayloadV2Mvp(params: {
  queueId: string;
  audioHash: string;
  decision: "approved" | "rejected";
  durationS?: number | null;
  integratedLufs?: number | null;
  truePeakDbTp?: number | null;
  truePeakOversEvents?: FeedbackEventV2[] | null;
  clippedSampleCount?: number | null;
  crestFactorDb?: number | null;
  loudnessRangeLu?: number | null;
  phaseCorrelation?: number | null;
  midRmsDbfs?: number | null;
  sideRmsDbfs?: number | null;
  midSideEnergyRatio?: number | null;
  stereoWidthIndex?: number | null;
  spectralSubRmsDbfs?: number | null;
  spectralLowRmsDbfs?: number | null;
  spectralLowMidRmsDbfs?: number | null;
  spectralMidRmsDbfs?: number | null;
  spectralHighMidRmsDbfs?: number | null;
  spectralHighRmsDbfs?: number | null;
  spectralAirRmsDbfs?: number | null;
  meanShortCrestDb?: number | null;
  p95ShortCrestDb?: number | null;
  transientDensity?: number | null;
  punchIndex?: number | null;
  truePeakOvers?: FeedbackEventV2[];
  hardFailReasons?: Array<{
    id: string;
    metric?: string;
    threshold?: number;
    value?: number;
  }> | null;
  codecSimulation?: FeedbackPayloadV2["codec_simulation"] | null;
}): FeedbackPayloadV2 {
  const {
    queueId,
    audioHash,
    decision,
    durationS = null,
    integratedLufs = null,
    truePeakDbTp = null,
    truePeakOversEvents = null,
    clippedSampleCount = null,
    crestFactorDb = null,
    loudnessRangeLu = null,
    phaseCorrelation = null,
    midRmsDbfs = null,
    sideRmsDbfs = null,
    midSideEnergyRatio = null,
    stereoWidthIndex = null,
    spectralSubRmsDbfs = null,
    spectralLowRmsDbfs = null,
    spectralLowMidRmsDbfs = null,
    spectralMidRmsDbfs = null,
    spectralHighMidRmsDbfs = null,
    spectralHighRmsDbfs = null,
    spectralAirRmsDbfs = null,
    meanShortCrestDb = null,
    p95ShortCrestDb = null,
    transientDensity = null,
    punchIndex = null,
    truePeakOvers = [],
    codecSimulation = null,
  } = params;

  const highlights: string[] = [];
  const recommendations: FeedbackRecommendationV2[] = [];

  // Phase 2: Headroom Health (derived from codec simulation, if present)
  let metaSeverity: "info" | "warn" | "critical" =
    decision === "approved" ? "info" : "critical";
  const hh = headroomHealthFromCodecSim((params as any).codecSimulation);
  if (hh) {
    highlights.push(hh.highlight);

    // Escalate summary severity minimally (never lowers existing severity)
    if (hh.severity === "critical") {
      metaSeverity = "critical";
    } else if (hh.severity === "warn" && metaSeverity === "info") {
      metaSeverity = "warn";
    }
  }

  const hardFailReasons = Array.isArray(params.hardFailReasons) ? params.hardFailReasons : [];
  const hardFailTriggered = decision === "rejected" && hardFailReasons.length > 0;

  if (decision === "approved") {
    highlights.push("No hard-fail issues detected.");
  } else {
    highlights.push("Technical listenability problems detected (hard-fail).");
  }

  // --- True Peak policy (IMUSIC v1.0): hard-fail > +1.0 dBTP, warn if (0..+1.0], recommend -1.0 dBTP ---
  const tp =
    typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp) ? truePeakDbTp : null;

  const HARDFAIL_TRUEPEAK_DBTP = 1.0;
  const WARN_TRUEPEAK_EPS_DBTP = 0.01;

  if (tp !== null) {
    if (tp > HARDFAIL_TRUEPEAK_DBTP) {
      // CRITICAL (hard-fail threshold)
      highlights.push(`True Peak exceeds +1.0 dBTP (${tp.toFixed(3)} dBTP) — extreme; high risk of audible distortion after encoding.`);

      recommendations.push({
        id: "rec_true_peak_headroom",
        title: "Reduce true peak overs",
        severity: "critical",
        why: "True Peak exceeds +1.0 dBTP, which is extreme and likely to cause audible distortion after encoding/normalization.",
        how: [
          "Set limiter ceiling to -1.0 dBTP (streaming-safe)",
          "Reduce limiter input until True Peak stays <= 0.0 dBTP (aim for <= -1.0 dBTP ceiling)",
        ],
      });
    } else if (tp > WARN_TRUEPEAK_EPS_DBTP) {
      // WARN (borderline)
      highlights.push(`True Peak is above 0.0 dBTP (${tp.toFixed(3)} dBTP) — low encoding headroom; may clip after encoding.`);

      recommendations.push({
        id: "rec_true_peak_headroom",
        title: "Add more true peak headroom",
        severity: "warn",
        why: "True Peak is above 0.0 dBTP — this can clip after encoding on some platforms.",
        how: [
          "Set limiter ceiling to -1.0 dBTP (recommended for streaming)",
          "Reduce limiter input by ~0.2–1.0 dB",
        ],
      });
    } else {
      // No highlight by default when OK
    }
  }

  // --- Clipping policy (IMUSIC v1.0): hard-fail only if massive (>= 100 clipped samples) ---
  const clipped =
    typeof clippedSampleCount === "number" && Number.isFinite(clippedSampleCount)
      ? clippedSampleCount
      : null;

  const HARDFAIL_CLIPPED_SAMPLES = 100;

  if (clipped !== null) {
    if (clipped >= HARDFAIL_CLIPPED_SAMPLES) {
      highlights.push("Massive clipping detected (>= 100 clipped samples) — likely audible distortion.");

      recommendations.push({
        id: "rec_massive_clipping",
        title: "Fix massive clipping",
        severity: "critical",
        why: "Massive clipping is likely audible and indicates a broken or severely overdriven master.",
        how: [
          "Reduce master gain / limiter input until clipping stops",
          "Disable hard clipper or reduce drive",
          "Check inter-sample peaks; set limiter ceiling to -1.0 dBTP",
        ],
      });
    } else if (clipped > 0) {
      highlights.push("Minor clipping detected (some clipped samples) — may be inaudible but risky for encoding.");

      recommendations.push({
        id: "rec_minor_clipping",
        title: "Reduce clipping risk",
        severity: "warn",
        why: "A small number of clipped samples may be inaudible but can become worse after encoding.",
        how: [
          "Reduce limiter input slightly",
          "Check for overs on transient hits; ease clipper drive if used",
          "Keep true peak headroom (ceiling -1.0 dBTP recommended)",
        ],
      });
    }
  }

  if (typeof crestFactorDb === "number" && Number.isFinite(crestFactorDb)) {
    if (crestFactorDb < 6) {
      highlights.push("Crest Factor is very low (track may be over-compressed).");
      recommendations.push({
        id: "rec_crest_factor_low",
        severity: "warn",
        title: "Increase dynamic impact (crest factor)",
        why: "A very low crest factor can indicate over-limiting/compression, reducing punch and clarity.",
        how: ["Reduce limiter gain reduction", "Use slower release times on compression", "Let transients through (less clipping/soft-clip)"],
      });
    } else if (crestFactorDb > 16) {
      highlights.push("Crest Factor is very high (track may be very dynamic).");
      recommendations.push({
        id: "rec_crest_factor_high",
        severity: "info",
        title: "Check loudness consistency",
        why: "A very high crest factor can indicate big peak-to-average differences. Ensure perceived loudness is consistent for your target.",
        how: ["Check if drums/transients are too spiky", "Consider gentle bus compression", "Compare against a reference at matched loudness"],
      });
    }
  }

  // Loudness Range (LRA) — neutral display + objective extremes (genre-agnostic)
  if (typeof loudnessRangeLu === "number" && Number.isFinite(loudnessRangeLu)) {
    // Always show neutral value (no judgement)
    highlights.push(`Loudness Range (LRA): ${loudnessRangeLu.toFixed(1)} LU`);

    // Only classify extremes
    if (loudnessRangeLu < 2) {
      highlights.push("Loudness Range (LRA) is very low (< 2 LU) — dynamics are extremely limited.");
      recommendations.push({
        id: "rec_lra_very_low",
        severity: "warn",
        title: "Increase loudness range (LRA)",
        why: "A very low LRA indicates extremely limited dynamics, often caused by heavy limiting or over-compression.",
        how: [
          "Reduce limiter gain reduction and/or raise limiter ceiling slightly",
          "Use slower attack/release or less aggressive compression on the mix bus",
          "Add transient detail (e.g., drums) without increasing peak overs",
        ],
      });
    } else if (loudnessRangeLu > 10) {
      highlights.push("Loudness Range (LRA) is very high (> 10 LU) — large dynamic variations detected.");
      recommendations.push({
        id: "rec_lra_very_high",
        severity: "info",
        title: "Check dynamic consistency (LRA)",
        why: "A very high LRA means loud and quiet sections differ strongly, which can affect perceived consistency across playback environments.",
        how: [
          "Check whether quieter sections remain audible on consumer playback",
          "Tame occasional peaks with gentle compression instead of hard limiting",
          "Compare sections at matched loudness and adjust automation if needed",
        ],
      });
    }
  }

  // NACHHER (Phase Correlation v2 rule)
  if (typeof phaseCorrelation === "number" && Number.isFinite(phaseCorrelation)) {
    // Always neutral highlight (no genre bias)
    highlights.push("Phase correlation is in a safe range for mono compatibility.");

    // Only classify extremes
    if (phaseCorrelation < 0) {
      highlights.push("Phase correlation is negative (< 0) — likely phase cancellation and audible loss in mono.");
      recommendations.push({
        id: "rec_phase_corr_negative",
        severity: "critical",
        title: "Fix phase cancellation risk (mono compatibility)",
        why: "Negative phase correlation indicates likely cancellations when summed to mono (clubs, phones, some playback chains).",
        how: [
          "Disable or reduce any stereo widener / phase-based widening on main elements.",
          "Check polarity on layered sounds and buses (try flipping polarity on one layer).",
          "Inspect stereo FX (chorus, flanger, phaser) — reduce depth/mix or move to returns.",
          "Make sub/bass mono; move wide layers higher in the spectrum.",
        ],
      });
    } else if (phaseCorrelation < 0.2) {
      highlights.push("Phase correlation is low (< 0.2) — mono compatibility may suffer on some systems.");
      recommendations.push({
        id: "rec_phase_corr_low",
        severity: "warn",
        title: "Improve mono compatibility stability",
        why: "Low phase correlation can reduce stability across speakers and may cause element loss when summed to mono.",
        how: [
          "Check mono playback for loss of key elements (lead, bass, kick).",
          "Reduce stereo widening on critical elements (especially low-mids and bass).",
          "If using Haas/delays, lower the wet mix or shorten delay times.",
          "Prefer mid-focused bass; keep sub strictly mono.",
        ],
      });
    }
  }

  // NACHHER (Stereo Width Index v2 rule)
  if (typeof stereoWidthIndex === "number" && Number.isFinite(stereoWidthIndex)) {
    // Always neutral highlight (no genre bias)
    highlights.push("Stereo width is in a balanced range.");

    // Only classify extremes
    if (stereoWidthIndex < 0.05) {
      highlights.push("Stereo width is very low (< 0.05) — the mix is strongly mono-focused.");
      recommendations.push({
        id: "rec_stereo_width_very_low",
        severity: "info",
        title: "Check if additional width is desired",
        why: "Very low stereo width indicates a strongly center-focused mix. This can be intentional, but may feel narrow on headphones.",
        how: [
          "If the track feels narrow, add width using subtle stereo ambience or short room reverbs.",
          "Use stereo widening on high-frequency layers only (avoid widening bass/low-mids).",
          "Check that stereo effects are not collapsed by routing or mono buses.",
        ],
      });
    } else if (stereoWidthIndex > 0.6) {
      highlights.push("Stereo width is very high (> 0.6) — translation may suffer across speakers and mono playback.");
      recommendations.push({
        id: "rec_stereo_width_very_high",
        severity: "warn",
        title: "Reduce extreme stereo width for better translation",
        why: "Very high stereo width can reduce center stability, perceived punch, and can worsen mono translation on some systems.",
        how: [
          "Reduce stereo widening on core elements (lead, snare, bass fundamentals).",
          "Keep sub and bass strictly mono; move width to upper layers and reverbs.",
          "Check mono playback for element loss; adjust widening/FX mix until stable.",
          "Avoid extreme Haas delays on main elements; lower wet mix or shorten delays.",
        ],
      });
    }
  }

  // NACHHER (Mid/Side Energy Ratio v2 rule)
  if (typeof midSideEnergyRatio === "number" && Number.isFinite(midSideEnergyRatio)) {
    // Always neutral highlight (no genre bias)
    highlights.push("Mid/Side energy distribution is balanced.");

    // Only classify extremes
    if (midSideEnergyRatio < 0.1) {
      highlights.push("Side energy is very low (< 0.10) — the mix is heavily center-focused.");
      recommendations.push({
        id: "rec_ms_ratio_low_side",
        severity: "info",
        title: "Consider adding controlled side content",
        why: "Very low side energy indicates an unusually center-focused mix. This can be intentional, but may reduce spaciousness on headphones.",
        how: [
          "If the mix feels narrow, add controlled stereo elements in upper frequencies.",
          "Use stereo reverbs or ambient layers instead of widening bass or low-mids.",
          "Keep core elements centered but allow air and FX to spread.",
        ],
      });
    } else if (midSideEnergyRatio > 0.45) {
      highlights.push("Side energy is very high (> 0.45) — stereo elements may overpower the center image.");
      recommendations.push({
        id: "rec_ms_ratio_high_side",
        severity: "warn",
        title: "Rebalance mid/side energy for stable translation",
        why: "High side energy can weaken the center image and reduce translation across different playback systems, especially mono.",
        how: [
          "Ensure kick, bass, and main lead remain clearly present in the mid channel.",
          "Reduce stereo widening on important melodic or rhythmic elements.",
          "Check mono playback for level drops or tonal imbalance.",
          "Move extreme stereo FX to background layers.",
        ],
      });
    }
  }

  // --- Spectral Balance (genre-agnostic, relative band deltas) ---
  const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

  const sub = spectralSubRmsDbfs;
  const low = spectralLowRmsDbfs;
  const lowmid = spectralLowMidRmsDbfs;
  const mid = spectralMidRmsDbfs;
  const highmid = spectralHighMidRmsDbfs;
  const high = spectralHighRmsDbfs;
  const air = spectralAirRmsDbfs;

  // Neutral highlight only if we have enough bands to say something meaningful
  const presentBandCount = [sub, low, lowmid, mid, highmid, high, air].filter((v) => isNum(v)).length;

  if (presentBandCount >= 4) {
    highlights.push("Spectral energy distribution is within a typical broadband range.");
  }

  // 1) Sub vs Low balance (boom / missing sub)
  if (isNum(sub) && isNum(low)) {
    const deltaSubLow = sub - low;

    if (deltaSubLow > 8) {
      highlights.push("Sub energy is strongly above low band (> 8 dB) — potential boom/translation risk.");
      recommendations.push({
        id: "rec_spectral_sub_dominant",
        severity: "warn",
        title: "Reduce excessive sub dominance",
        why: "Sub energy far above the low band can cause boomy playback and inconsistent translation across systems.",
        how: [
          "Check sub/bass balance on small speakers and in mono.",
          "Reduce sub layer level or narrow the sub to mono while controlling resonances.",
          "Use gentle EQ or dynamic EQ on the sub band to tame peaks.",
        ],
      });
    } else if (deltaSubLow < -10) {
      highlights.push("Sub energy is far below low band (< -10 dB) — low-end may lack deep sub extension.");
      recommendations.push({
        id: "rec_spectral_sub_missing",
        severity: "info",
        title: "Check sub extension (if desired)",
        why: "Very low sub energy relative to the low band can reduce perceived depth on full-range systems.",
        how: [
          "Check if the track needs deeper sub extension for your target playback.",
          "If needed, add a controlled sub layer and keep it mono.",
          "Avoid boosting sub blindly; balance against low band and monitor headroom.",
        ],
      });
    }
  }

  // 2) Low-mid dominance (masking/mud risk)
  if (isNum(lowmid) && isNum(mid)) {
    if (lowmid > mid + 8) {
      highlights.push("Low-mid energy is strongly above mid (> 8 dB) — masking/muddiness risk.");
      recommendations.push({
        id: "rec_spectral_lowmid_dominant",
        severity: "warn",
        title: "Reduce low-mid masking",
        why: "Excess low-mid density can mask vocals/leads and reduce clarity across playback systems.",
        how: [
          "Identify and reduce resonances in the low-mid range with EQ or dynamic EQ.",
          "Check overlapping instruments (pads/bass/low synths) and carve space.",
          "Compare to a reference at matched loudness to confirm balance.",
        ],
      });
    }
  }

  // 3) High-mid dominance (harshness risk)
  if (isNum(highmid) && isNum(mid)) {
    if (highmid > mid + 8) {
      highlights.push("High-mid energy is strongly above mid (> 8 dB) — harshness/fatigue risk.");
      recommendations.push({
        id: "rec_spectral_highmid_dominant",
        severity: "warn",
        title: "Reduce high-mid harshness risk",
        why: "Excess high-mid energy can cause fatigue and harsh translation on bright systems.",
        how: [
          "Sweep for harsh resonances and reduce with narrow EQ or dynamic EQ.",
          "Check distortion/saturation on leads and cymbals; reduce drive if needed.",
          "Test on earbuds and small speakers at moderate volume.",
        ],
      });
    }
  }

  // 4) Air vs High balance (dull vs excessive ultra-high)
  if (isNum(air) && isNum(high)) {
    const deltaAirHigh = air - high;

    if (deltaAirHigh < -12) {
      highlights.push("Air band is far below high band (< -12 dB) — very little ultra-high energy detected.");
      recommendations.push({
        id: "rec_spectral_air_low",
        severity: "info",
        title: "Check top-end air (if desired)",
        why: "Very low air energy can reduce perceived openness on some playback systems.",
        how: [
          "Check if the mix feels dull compared to a reference at matched loudness.",
          "If needed, add subtle high-shelf EQ or controlled excitation on select elements.",
          "Avoid adding hiss; focus on cymbals/FX brightness and clean transients.",
        ],
      });
    } else if (deltaAirHigh > 6) {
      highlights.push("Air band is strongly above high band (> 6 dB) — potential excessive ultra-high content.");
      recommendations.push({
        id: "rec_spectral_air_high",
        severity: "warn",
        title: "Reduce excessive ultra-high content",
        why: "Excessive air band energy can sound brittle and translate poorly on bright playback chains.",
        how: [
          "Check for harsh noise/hiss from exciters, distortion, or overly bright reverbs.",
          "Reduce high-shelf boosts or exciter mix on buses.",
          "Test on bright headphones and earbuds at moderate volume.",
        ],
      });
    }
  }

  // --- Meta Pattern Layer v1 (cross-metric intelligence) ---

  // Pattern 1: Over-Limited Loudness
  if (
    typeof integratedLufs === "number" &&
    typeof loudnessRangeLu === "number" &&
    typeof truePeakDbTp === "number" &&
    integratedLufs >= -9.0 &&
    loudnessRangeLu < 2.0 &&
    truePeakDbTp > -1.0
  ) {
    const hasTruePeakRec = recommendations.some((r) => r.id === "rec_true_peak_headroom");
    const hasLraLowRec = recommendations.some((r) => r.id === "rec_lra_very_low");

    if (!(hasTruePeakRec && hasLraLowRec)) {
      highlights.push(
        "Compression-dominant loudness pattern detected (high loudness + very low LRA + low true-peak headroom)."
      );

      recommendations.push({
        id: "rec_pattern_over_limited",
        severity: "warn",
        title: "Reduce aggressive master limiting",
        why: "This combination often indicates aggressive limiting that can reduce punch and increase distortion risk after encoding.",
        how: [
          "Reduce limiter gain reduction and keep true peak ceiling at -1.0 dBTP.",
          "Let more transient detail through (less clipping/soft-clip on the master).",
          "Aim for slightly higher LRA by reducing bus compression intensity.",
        ],
      });

      if (metaSeverity === "info") metaSeverity = "warn";
    }
  }

  // Pattern 2: Wide but Unstable Stereo
  if (
    typeof stereoWidthIndex === "number" &&
    typeof phaseCorrelation === "number" &&
    stereoWidthIndex > 0.6 &&
    phaseCorrelation < 0.2
  ) {
    highlights.push(
      "Wide-but-unstable stereo pattern detected (high width + low phase correlation) — mono translation risk."
    );

    recommendations.push({
      id: "rec_pattern_wide_unstable",
      severity: "warn",
      title: "Stabilize stereo width for better translation",
      why: "High width combined with low correlation can cause element loss or tonal shifts on mono or speaker playback.",
      how: [
        "Reduce widening on core elements; keep width mainly in reverbs/upper layers.",
        "If using Haas delays, shorten delay times and lower wet mix.",
        "Test mono playback and adjust until key elements remain stable.",
      ],
    });
    if (metaSeverity === "info") metaSeverity = "warn";
  }

  // Pattern 3: Harsh but Flat
  if (
    typeof highmid === "number" &&
    typeof mid === "number" &&
    typeof crestFactorDb === "number" &&
    typeof loudnessRangeLu === "number" &&
    highmid > mid + 8 &&
    crestFactorDb < 8 &&
    loudnessRangeLu < 3
  ) {
    highlights.push(
      "High-mid dominant + low-dynamics pattern detected — fatigue risk on bright playback systems."
    );

    recommendations.push({
      id: "rec_pattern_harsh_flat",
      severity: "warn",
      title: "Reduce high-mid fatigue and restore dynamics",
      why: "Excess high-mid energy plus limited dynamics can sound aggressive and reduce long-term listening comfort.",
      how: [
        "Find harsh resonances in the high-mids and tame them with dynamic EQ.",
        "Reduce saturation/distortion drive on bright elements.",
        "Ease limiting/compression slightly to restore transient contrast.",
      ],
    });
    if (metaSeverity === "info") metaSeverity = "warn";
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "rec_placeholder_v2_mvp",
      severity: "info",
      title: "More technical modules coming next",
      why: "This v2 payload is the new scalable format. Next steps add timecoded analysis modules.",
      how: ["Next modules: spectral balance, harshness detection, stereo/phase, dynamics, clicks."],
    });
  }

  return {
    schema_version: 2,
    generated_at: new Date().toISOString(),
    analyzer: { engine: "immusic-dsp", engine_version: "1.0.0", profile: "feedback_v1" },
    track: {
      track_id: null,
      queue_id: queueId,
      audio_hash_sha256: audioHash,
      duration_s: typeof durationS === "number" && Number.isFinite(durationS) ? durationS : null,
      sample_rate_hz: null,
      channels: null,
    },
    summary: {
      status: "ok",
      severity: metaSeverity,
      highlights,
    },
    hard_fail: {
      triggered: hardFailTriggered,
      reasons: hardFailReasons,
    },
    metrics: {
      loudness: {
        lufs_i: typeof integratedLufs === "number" && Number.isFinite(integratedLufs) ? integratedLufs : null,
        true_peak_dbtp_max: typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp) ? truePeakDbTp : null,
      },
      spectral: {
        sub_rms_dbfs: typeof spectralSubRmsDbfs === "number" && Number.isFinite(spectralSubRmsDbfs) ? spectralSubRmsDbfs : null,
        low_rms_dbfs: typeof spectralLowRmsDbfs === "number" && Number.isFinite(spectralLowRmsDbfs) ? spectralLowRmsDbfs : null,
        lowmid_rms_dbfs: typeof spectralLowMidRmsDbfs === "number" && Number.isFinite(spectralLowMidRmsDbfs) ? spectralLowMidRmsDbfs : null,
        mid_rms_dbfs: typeof spectralMidRmsDbfs === "number" && Number.isFinite(spectralMidRmsDbfs) ? spectralMidRmsDbfs : null,
        highmid_rms_dbfs: typeof spectralHighMidRmsDbfs === "number" && Number.isFinite(spectralHighMidRmsDbfs) ? spectralHighMidRmsDbfs : null,
        high_rms_dbfs: typeof spectralHighRmsDbfs === "number" && Number.isFinite(spectralHighRmsDbfs) ? spectralHighRmsDbfs : null,
        air_rms_dbfs: typeof spectralAirRmsDbfs === "number" && Number.isFinite(spectralAirRmsDbfs) ? spectralAirRmsDbfs : null,
      },
      stereo: {
        phase_correlation:
          typeof phaseCorrelation === "number" && Number.isFinite(phaseCorrelation) ? phaseCorrelation : null,
        mid_rms_dbfs:
          typeof midRmsDbfs === "number" && Number.isFinite(midRmsDbfs) ? midRmsDbfs : null,
        side_rms_dbfs:
          typeof sideRmsDbfs === "number" && Number.isFinite(sideRmsDbfs) ? sideRmsDbfs : null,
        mid_side_energy_ratio:
          typeof midSideEnergyRatio === "number" && Number.isFinite(midSideEnergyRatio) ? midSideEnergyRatio : null,
        stereo_width_index:
          typeof stereoWidthIndex === "number" && Number.isFinite(stereoWidthIndex) ? stereoWidthIndex : null,
      },
      clipping: {
        clipped_sample_count:
          typeof clippedSampleCount === "number" && Number.isFinite(clippedSampleCount)
            ? clippedSampleCount
            : null,
      },
      dynamics: {
        crest_factor_db:
          typeof crestFactorDb === "number" && Number.isFinite(crestFactorDb) ? crestFactorDb : null,
        loudness_range_lu:
          typeof loudnessRangeLu === "number" && Number.isFinite(loudnessRangeLu) ? loudnessRangeLu : null,
      },
      silence: {},
      transients: {
        mean_short_crest_db:
          typeof meanShortCrestDb === "number" && Number.isFinite(meanShortCrestDb) ? meanShortCrestDb : null,
        p95_short_crest_db:
          typeof p95ShortCrestDb === "number" && Number.isFinite(p95ShortCrestDb) ? p95ShortCrestDb : null,
        transient_density:
          typeof transientDensity === "number" && Number.isFinite(transientDensity) ? transientDensity : null,
        punch_index:
          typeof punchIndex === "number" && Number.isFinite(punchIndex) ? punchIndex : null,
      },
    },
    events: {
      loudness: { true_peak_overs: Array.isArray(truePeakOversEvents) ? truePeakOversEvents : [] },
      spectral: {},
      stereo: {},
      clipping: {},
      dynamics: {},
      silence: {},
      transients: {},
    },
    recommendations,
    codec_simulation: codecSimulation ?? null,
    debug: null,
  };
}
