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
}): FeedbackPayloadV2 {
  const {
    queueId,
    audioHash,
    decision,
    integratedLufs = null,
    truePeakDbTp = null,
    clippedSampleCount = null,
    crestFactorDb = null,
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
      spectral: {},
      stereo: {},
      clipping: {
        clipped_sample_count:
          typeof clippedSampleCount === "number" && Number.isFinite(clippedSampleCount)
            ? clippedSampleCount
            : null,
      },
      dynamics: {
        crest_factor_db:
          typeof crestFactorDb === "number" && Number.isFinite(crestFactorDb) ? crestFactorDb : null,
      },
      silence: {},
      transients: {},
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
