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
}): FeedbackPayloadV2 {
  const {
    queueId,
    audioHash,
    decision,
    integratedLufs = null,
    truePeakDbTp = null,
    clippedSampleCount = null,
  } = params;

  const highlights: string[] = [];
  const recommendations: FeedbackRecommendationV2[] = [];

  if (decision === "approved") {
    highlights.push("No hard-fail issues detected.");
  } else {
    highlights.push("Technical listenability problems detected (hard-fail).");
  }

  if (typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp) && truePeakDbTp > 0) {
    highlights.push("True Peak is above 0.0 dBTP (risk of clipping after encoding).");
    recommendations.push({
      id: "rec_true_peak_headroom",
      severity: "critical",
      title: "Reduce true peak overs",
      why: "True Peak exceeds 0.0 dBTP, which can cause clipping after encoding/normalization.",
      how: ["Lower limiter ceiling to -1.0 dBTP", "Reduce input gain into the limiter by 1–2 dB"],
    });
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
      dynamics: {},
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
