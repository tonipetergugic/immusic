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
  debug: null;
};

export function buildFeedbackPayloadV2Mvp(params: {
  queueId: string;
  audioHash: string;
  decision: "approved" | "rejected";
  integratedLufs?: number | null;
  truePeakDbTp?: number | null;
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
}): FeedbackPayloadV2 {
  const {
    queueId,
    audioHash,
    decision,
    integratedLufs = null,
    truePeakDbTp = null,
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
  } = params;

  const highlights: string[] = [];
  const recommendations: FeedbackRecommendationV2[] = [];

  if (decision === "approved") {
    highlights.push("No hard-fail issues detected.");
  } else {
    highlights.push("Technical listenability problems detected (hard-fail).");
  }

  if (typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp)) {
    if (truePeakDbTp > 0) {
      highlights.push("True Peak is above 0.0 dBTP (very high risk of clipping after encoding).");
      recommendations.push({
        id: "rec_true_peak_headroom",
        severity: "critical",
        title: "Reduce true peak overs",
        why: "True Peak exceeds 0.0 dBTP, which can cause clipping after encoding/normalization.",
        how: ["Lower limiter ceiling to -1.0 dBTP", "Reduce input gain into the limiter by 1–2 dB"],
      });
    } else if (truePeakDbTp > -1.0) {
      highlights.push("True Peak is above -1.0 dBTP (encoding headroom is low).");
      recommendations.push({
        id: "rec_true_peak_headroom",
        severity: "warn",
        title: "Add more true peak headroom",
        why: "True Peak is above -1.0 dBTP. Some encoders and playback chains can increase peaks, risking audible distortion.",
        how: ["Set limiter ceiling to -1.0 dBTP", "Reduce limiter input by ~0.5–1.5 dB"],
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

  if (typeof phaseCorrelation === "number" && Number.isFinite(phaseCorrelation)) {
    if (phaseCorrelation < -0.2) {
      highlights.push("Strong anti-phase content detected (high mono compatibility risk).");
      recommendations.push({
        id: "rec_phase_correlation_critical",
        severity: "critical",
        title: "Fix anti-phase stereo issues",
        why: "Phase correlation is strongly negative, which can cause cancellations when played in mono (clubs, phones, some playback chains).",
        how: [
          "Check stereo widening on low end (keep bass/kick mono)",
          "Reduce extreme stereo enhancers or invert/phasey effects",
          "Use a correlation meter and test in mono",
        ],
      });
    } else if (phaseCorrelation < 0) {
      highlights.push("Negative phase correlation detected (mono compatibility may suffer).");
      recommendations.push({
        id: "rec_phase_correlation_warn",
        severity: "warn",
        title: "Improve mono compatibility",
        why: "Phase correlation is below 0, which can indicate phase cancellation in mono playback.",
        how: [
          "Collapse low frequencies to mono (e.g., <120 Hz)",
          "Reduce stereo width on critical elements",
          "Check for phase inversion on one channel",
        ],
      });
    } else if (phaseCorrelation <= 0.2) {
      highlights.push("Stereo correlation is low (very wide/uncorrelated).");
      recommendations.push({
        id: "rec_phase_correlation_low",
        severity: "info",
        title: "Check stereo stability",
        why: "Low correlation can be fine, but may reduce punch or stability on some systems.",
        how: [
          "Check mono playback for punch/clarity",
          "Avoid ultra-wide processing on core elements (kick, bass, lead)",
        ],
      });
    }
  }

  // Mid/Side width (objective, no genre bias)
  if (typeof stereoWidthIndex === "number" && Number.isFinite(stereoWidthIndex)) {
    if (stereoWidthIndex < 0.05) {
      highlights.push("Stereo image is extremely narrow (almost mono-dominant).");
      recommendations.push({
        id: "rec_stereo_width_too_narrow",
        severity: "info",
        title: "Check stereo width",
        why: "Stereo width index is very low. This can be intentional, but you may want more stereo separation for ambience/pads/fx.",
        how: [
          "Add subtle stereo ambience (reverb/room) instead of widening core elements",
          "Keep kick/bass mono, but allow controlled width on higher elements",
          "Compare against a reference in mono and stereo",
        ],
      });
    } else if (stereoWidthIndex > 0.60) {
      highlights.push("Stereo image is extremely wide (high side energy).");
      recommendations.push({
        id: "rec_stereo_width_too_wide",
        severity: "warn",
        title: "Reduce extreme stereo width",
        why: "Stereo width index is very high. This can reduce punch/center stability and may create mono compatibility issues.",
        how: [
          "Reduce stereo widening on leads/pads",
          "High-pass the side channel (keep low end centered)",
          "Test mono playback for punch and phase cancellations",
        ],
      });
    }
  }

  if (typeof midSideEnergyRatio === "number" && Number.isFinite(midSideEnergyRatio)) {
    if (midSideEnergyRatio > 1.0) {
      highlights.push("Side energy exceeds mid energy (unusual stereo balance).");
      recommendations.push({
        id: "rec_mid_side_balance",
        severity: "warn",
        title: "Rebalance mid/side energy",
        why: "Side energy ratio is above 1.0, which can indicate unstable center image or overly wide processing.",
        how: [
          "Lower stereo width / side gain on wideners",
          "Ensure main elements (kick, bass, lead) stay centered",
          "Check for phasey stereo FX dominating the mix",
        ],
      });
    }
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
      duration_s: null,
      sample_rate_hz: null,
      channels: null,
    },
    summary: {
      status: "ok",
      severity: decision === "approved" ? "info" : "critical",
      highlights,
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
      loudness: { true_peak_overs: [] },
      spectral: {},
      stereo: {},
      clipping: {},
      dynamics: {},
      silence: {},
      transients: {},
    },
    recommendations,
    debug: null,
  };
}
