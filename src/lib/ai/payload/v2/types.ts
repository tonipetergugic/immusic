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

export type DynamicsHealthLabelV1 = "healthy" | "borderline" | "over-limited";

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
    status: "ok" | "approved" | "approved_with_risks" | "hard-fail";
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
      short_term_lufs_timeline?: Array<{ t: number; lufs: number }>;
      headroom_engineering?: {
        score_0_100: number | null;
        badge: "healthy" | "ok" | "warn" | "critical" | null;
        effective_headroom_dbtp: number | null;
        source_headroom_dbtp: number | null;
        post_encode_headroom_dbtp: number | null;
        worst_post_true_peak_dbtp: number | null;
      };
      streaming_normalization?: {
        spotify: {
          target_lufs_i: number;
          desired_gain_db: number | null;
          applied_gain_db: number | null;
          max_up_gain_db: number | null;
          mode: "up_down";
        };
        youtube: {
          target_lufs_i: number;
          desired_gain_db: number | null;
          applied_gain_db: number | null;
          max_up_gain_db: null;
          mode: "down_only";
        };
        apple_music: {
          target_lufs_i: number;
          desired_gain_db: number | null;
          applied_gain_db: number | null;
          max_up_gain_db: number | null;
          mode: "limited_up";
        };
      };
    };
    spectral: Record<string, unknown>;
    stereo: Record<string, unknown>;
    low_end: Record<string, unknown>;
    clipping: Record<string, unknown>;
    dynamics: Record<string, unknown>;
    silence: Record<string, unknown>;
    transients: Record<string, unknown>;
  };
  dynamics_health: {
    score: number; // 0–100
    label: "healthy" | "borderline" | "over-limited";
    factors: {
      lufs: number | null;
      lra: number | null;
      crest: number | null;
    };
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

