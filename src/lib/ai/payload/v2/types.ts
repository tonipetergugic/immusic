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

export type StructureAnalysisV1 = {
  energy_curve: Array<{ t: number; e: number }>;
  density_zones: {
    distribution: { low: number; mid: number; high: number; extreme: number };
    dominant_zone: "low" | "mid" | "high" | "extreme" | null;
    entropy_score: number; // 0..100
  };
  tension_release: {
    tension_index: number; // 0..100
    release_index: number; // 0..100
    balance: number; // 0..100
    drops: Array<{
      t: number;
      drop_energy: number;
      build_mean_energy: number;
      impact: number; // 0..1 (raw)
      impact_score: number; // 0..100
    }>;
  };
  primary_peak: {
    t: number;
    energy: number;
    score: number; // 0..1
    contrast: number; // raw
    sustain: number; // 0..1
    is_drop_peak: boolean;
  } | null;
  peaks: Array<{
    t: number;
    energy: number;
    score: number; // 0..1
    contrast: number; // raw
    sustain: number; // 0..1
  }>;
  sections: Array<
    | { type: "intro"; start: number; end: number }
    | { type: "build"; start: number; end: number }
    | { type: "break"; start: number; end: number }
    | { type: "outro"; start: number; end: number }
    | { type: "drop"; t: number; impact: number; impact_score: number }
  >;
  section_similarity?: {
    pairs: Array<{
      from: "intro" | "build" | "break" | "outro";
      from_index: number;
      to: "intro" | "build" | "break" | "outro";
      to_index: number;
      similarity_0_1: number;
      features: {
        duration_s: { a: number; b: number };
        mean_energy: { a: number; b: number };
        max_energy: { a: number; b: number };
        energy_variance: { a: number; b: number };
        start_energy: { a: number; b: number };
        end_energy: { a: number; b: number };
        energy_delta: { a: number; b: number };
        local_peak_density: { a: number; b: number };
      };
    }>;
    highest_similarity_0_1: number | null;
    mean_similarity_0_1: number | null;
  };
  repetition_ratio_0_1?: number | null;
  unique_section_count?: number | null;
  transition_strength_0_1?: number | null;
  novelty_change_strength_0_1?: number | null;
  drop_to_drop_similarity?: {
    pairs: Array<{
      from_index: number;
      to_index: number;
      similarity_0_1: number;
      features: {
        drop_energy: { a: number; b: number };
        build_mean_energy: { a: number; b: number };
        impact: { a: number; b: number };
        impact_score: { a: number; b: number };
      };
    }>;
    highest_similarity_0_1: number | null;
    mean_similarity_0_1: number | null;
  };
  decision_inputs?: {
    repetition_ratio_0_1: number | null;
    unique_section_count: number | null;
    transition_strength_0_1: number | null;
    novelty_change_strength_0_1: number | null;
    section_similarity_highest_0_1: number | null;
    section_similarity_mean_0_1: number | null;
    drop_to_drop_similarity_highest_0_1: number | null;
    drop_to_drop_similarity_mean_0_1: number | null;
    declared_main_genre: string | null;
    declared_subgenre: string | null;
    declared_reference_artist: string | null;
    declared_reference_track: string | null;
  };
  decision_candidate?: {
    status_candidate: "balanced" | "repetitive" | "underdeveloped" | "unclear";
    primary_reason_candidate:
      | "high_repetition_low_novelty"
      | "low_section_count_weak_transitions"
      | "healthy_variation_and_transitions"
      | "mixed_or_insufficient_signals";
    next_action_candidate:
      | "increase_section_contrast"
      | "add_or_strengthen_structural_change"
      | "preserve_structure_refine_details"
      | "review_structure_manually";
    evidence_snapshot: {
      repetition_ratio_0_1: number | null;
      unique_section_count: number | null;
      transition_strength_0_1: number | null;
      novelty_change_strength_0_1: number | null;
      section_similarity_mean_0_1: number | null;
      drop_to_drop_similarity_mean_0_1: number | null;
    };
  };
  decision_rule_context?: {
    active_genre_profile:
      | "trance_like"
      | "techno_like"
      | "house_edm_like"
      | "bass_music_like"
      | "hard_dance_like"
      | "pop_urban_like"
      | "rock_metal_like"
      | "other_like"
      | "unknown";
    repetitive_thresholds: {
      repetition_min: number;
      novelty_max: number;
    };
    balanced_thresholds: {
      repetition_max: number;
      novelty_min: number;
      transition_min: number;
    };
    underdeveloped_thresholds: {
      unique_section_count_max: number;
      transition_max: number;
      novelty_max: number;
    };
    similarity_thresholds: {
      repetitive: {
        section_similarity_mean_min: number;
        drop_to_drop_similarity_mean_min: number;
      };
      balanced: {
        section_similarity_mean_max: number;
        drop_to_drop_similarity_mean_max: number;
      };
    };
  };
  decision_trace?: {
    matched_rule_branch:
      | "repetitive"
      | "underdeveloped"
      | "balanced"
      | "unclear";
    threshold_profile_source: "genre_profile" | "default_profile";
    branch_results: {
      repetitive: {
        matched: boolean;
        passed_conditions: string[];
        failed_conditions: string[];
      };
      underdeveloped: {
        matched: boolean;
        passed_conditions: string[];
        failed_conditions: string[];
      };
      balanced: {
        matched: boolean;
        passed_conditions: string[];
        failed_conditions: string[];
      };
    };
    selected_branch_reason:
      | "matched_priority_rule"
      | "fallback_unclear_no_rule_matched";
    key_threshold_comparisons: {
      repetitive: {
        repetition_ratio_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        novelty_change_strength_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        section_similarity_mean_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        drop_to_drop_similarity_mean_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
      };
      underdeveloped: {
        unique_section_count: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        transition_strength_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        novelty_change_strength_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
      };
      balanced: {
        repetition_ratio_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        novelty_change_strength_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        transition_strength_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        section_similarity_mean_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
        drop_to_drop_similarity_mean_0_1: {
          value: number | null;
          threshold: number;
          passed: boolean;
        };
      };
    };
    close_calls: string[];
  };
  decision_summary?: {
    status: "balanced" | "repetitive" | "underdeveloped" | "unclear";
    main_reason:
      | "high_repetition_low_novelty"
      | "low_section_count_weak_transitions"
      | "healthy_variation_and_transitions"
      | "mixed_or_insufficient_signals";
    next_action:
      | "increase_section_contrast"
      | "add_or_strengthen_structural_change"
      | "preserve_structure_refine_details"
      | "review_structure_manually";
    confidence_level: "high" | "medium" | "low";
    evidence: {
      repetition_ratio_0_1: number | null;
      unique_section_count: number | null;
      transition_strength_0_1: number | null;
      novelty_change_strength_0_1: number | null;
      section_similarity_mean_0_1: number | null;
      drop_to_drop_similarity_mean_0_1: number | null;
    };
  };
  explanation_inputs?: {
    status: "balanced" | "repetitive" | "underdeveloped" | "unclear";
    main_reason:
      | "high_repetition_low_novelty"
      | "low_section_count_weak_transitions"
      | "healthy_variation_and_transitions"
      | "mixed_or_insufficient_signals";
    next_action:
      | "increase_section_contrast"
      | "add_or_strengthen_structural_change"
      | "preserve_structure_refine_details"
      | "review_structure_manually";
    confidence_level: "high" | "medium" | "low";
    matched_rule_branch:
      | "repetitive"
      | "underdeveloped"
      | "balanced"
      | "unclear";
    threshold_profile_source: "genre_profile" | "default_profile";
    active_genre_profile:
      | "trance_like"
      | "techno_like"
      | "house_edm_like"
      | "bass_music_like"
      | "hard_dance_like"
      | "pop_urban_like"
      | "rock_metal_like"
      | "other_like"
      | "unknown";
    declared_main_genre: string | null;
    declared_subgenre: string | null;
    declared_reference_artist: string | null;
    declared_reference_track: string | null;
    evidence: {
      repetition_ratio_0_1: number | null;
      unique_section_count: number | null;
      transition_strength_0_1: number | null;
      novelty_change_strength_0_1: number | null;
      section_similarity_mean_0_1: number | null;
      drop_to_drop_similarity_mean_0_1: number | null;
    };
  };
  explanation_candidate?: {
    tone: "affirming" | "corrective" | "cautious";
    focus:
      | "variation"
      | "structure_growth"
      | "preserve_strength"
      | "manual_review";
    caution_level: "low" | "medium" | "high";
    similarity_read:
      | "pattern_reinforces_repetition"
      | "pattern_supports_balance"
      | "pattern_is_mixed"
      | "similarity_signal_unavailable";
  };
  wording_plan?: {
    headline_key:
      | "balanced_structure"
      | "repetition_warning"
      | "structure_growth_needed"
      | "manual_review_needed";
    body_focus_key:
      | "highlight_strengths"
      | "increase_variation"
      | "strengthen_structure_changes"
      | "explain_uncertainty";
    caution_mode: "low" | "medium" | "high";
    similarity_emphasis:
      | "highlight_repetition_patterns"
      | "highlight_balanced_patterns"
      | "highlight_mixed_patterns"
      | "highlight_missing_similarity_context";
  };
  wording_payload?: {
    headline_key:
      | "balanced_structure"
      | "repetition_warning"
      | "structure_growth_needed"
      | "manual_review_needed";
    body_focus_key:
      | "highlight_strengths"
      | "increase_variation"
      | "strengthen_structure_changes"
      | "explain_uncertainty";
    caution_mode: "low" | "medium" | "high";
    similarity_emphasis:
      | "highlight_repetition_patterns"
      | "highlight_balanced_patterns"
      | "highlight_mixed_patterns"
      | "highlight_missing_similarity_context";
    status: "balanced" | "repetitive" | "underdeveloped" | "unclear";
    main_reason:
      | "high_repetition_low_novelty"
      | "low_section_count_weak_transitions"
      | "healthy_variation_and_transitions"
      | "mixed_or_insufficient_signals";
    next_action:
      | "increase_section_contrast"
      | "add_or_strengthen_structural_change"
      | "preserve_structure_refine_details"
      | "review_structure_manually";
    confidence_level: "high" | "medium" | "low";
    active_genre_profile:
      | "trance_like"
      | "techno_like"
      | "house_edm_like"
      | "bass_music_like"
      | "hard_dance_like"
      | "pop_urban_like"
      | "rock_metal_like"
      | "other_like"
      | "unknown";
    declared_main_genre: string | null;
    declared_subgenre: string | null;
    declared_reference_artist: string | null;
    declared_reference_track: string | null;
    evidence: {
      repetition_ratio_0_1: number | null;
      unique_section_count: number | null;
      transition_strength_0_1: number | null;
      novelty_change_strength_0_1: number | null;
      section_similarity_mean_0_1: number | null;
      drop_to_drop_similarity_mean_0_1: number | null;
    };
  };
  wording_guardrails?: {
    avoid_absolute_judgment: boolean;
    require_evidence_based_language: boolean;
    require_genre_relative_language: boolean;
    preserve_artistic_intent_space: boolean;
    require_similarity_context_caution: boolean;
    require_similarity_genre_relative_language: boolean;
    preferred_phrases: string[];
    forbidden_phrases: string[];
    similarity_preferred_phrases: string[];
    similarity_forbidden_phrases: string[];
  };
  consultant_payload?: {
    decision: {
      status: "balanced" | "repetitive" | "underdeveloped" | "unclear";
      main_reason:
        | "high_repetition_low_novelty"
        | "low_section_count_weak_transitions"
        | "healthy_variation_and_transitions"
        | "mixed_or_insufficient_signals";
      next_action:
        | "increase_section_contrast"
        | "add_or_strengthen_structural_change"
        | "preserve_structure_refine_details"
        | "review_structure_manually";
      confidence_level: "high" | "medium" | "low";
    };
    wording: {
      headline_key:
        | "balanced_structure"
        | "repetition_warning"
        | "structure_growth_needed"
        | "manual_review_needed";
      body_focus_key:
        | "highlight_strengths"
        | "increase_variation"
        | "strengthen_structure_changes"
        | "explain_uncertainty";
      caution_mode: "low" | "medium" | "high";
      similarity_emphasis:
        | "highlight_repetition_patterns"
        | "highlight_balanced_patterns"
        | "highlight_mixed_patterns"
        | "highlight_missing_similarity_context";
    };
    similarity_read:
      | "pattern_reinforces_repetition"
      | "pattern_supports_balance"
      | "pattern_is_mixed"
      | "similarity_signal_unavailable";
    guardrails: {
      avoid_absolute_judgment: boolean;
      require_evidence_based_language: boolean;
      require_genre_relative_language: boolean;
      preserve_artistic_intent_space: boolean;
      require_similarity_context_caution: boolean;
      require_similarity_genre_relative_language: boolean;
      preferred_phrases: string[];
      forbidden_phrases: string[];
      similarity_preferred_phrases: string[];
      similarity_forbidden_phrases: string[];
    };
    genre_context: {
      declared_main_genre: string | null;
      declared_subgenre: string | null;
      declared_reference_artist: string | null;
      declared_reference_track: string | null;
      active_genre_profile:
        | "trance_like"
        | "techno_like"
        | "house_edm_like"
        | "bass_music_like"
        | "hard_dance_like"
        | "pop_urban_like"
        | "rock_metal_like"
        | "other_like"
        | "unknown";
    };
    similarity_thresholds: {
      repetitive: {
        section_similarity_mean_min: number;
        drop_to_drop_similarity_mean_min: number;
      };
      balanced: {
        section_similarity_mean_max: number;
        drop_to_drop_similarity_mean_max: number;
      };
    };
    evidence: {
      repetition_ratio_0_1: number | null;
      unique_section_count: number | null;
      transition_strength_0_1: number | null;
      novelty_change_strength_0_1: number | null;
      section_similarity_mean_0_1: number | null;
      drop_to_drop_similarity_mean_0_1: number | null;
    };
  };
  genre_context?: {
    declared_main_genre: string | null;
    declared_subgenre: string | null;
    declared_reference_artist: string | null;
    declared_reference_track: string | null;
  };
  genre_rule_context?: {
    main_genre_key: string | null;
    subgenre_key: string | null;
    has_reference_artist: boolean;
    has_reference_track: boolean;
    genre_rules_ready: boolean;
  };
  genre_rule_profile?: {
    profile_key:
      | "trance_like"
      | "techno_like"
      | "house_edm_like"
      | "bass_music_like"
      | "hard_dance_like"
      | "pop_urban_like"
      | "rock_metal_like"
      | "other_like"
      | "unknown";
    derived_from_main_genre: string | null;
    derived_from_subgenre: string | null;
  };
  // UI-only: neutral segment spans (derived from sections with start/end)
  segments?: Array<{ start: number; end: number }>;
  segment_count_spans?: number;
  stabilization?: {
    ranges_before: number;
    ranges_after_stabilize: number;
    ranges_after_sequence: number;
    merges_estimated: number;
  };
  arc?: import("@/lib/ai/payload/v2/modules/structureEnergyArcTypizerV1").EnergyArcResultV1;
  drop_confidence?: import("@/lib/ai/payload/v2/modules/structureDropConfidenceV1").DropConfidenceResultV1;
  hook?: import("@/lib/ai/payload/v2/modules/structureHookDetectionV1").HookDetectionResultV1 | null;
  balance?: import("@/lib/ai/payload/v2/modules/structureBalanceIndexV1").StructuralBalanceResultV1 | null;
  arrangement_density?: import("@/lib/ai/payload/v2/modules/structureArrangementDensityV1").ArrangementDensityResultV1;
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

    // Private metrics (persisted from track_ai_private_metrics; not shown to listeners)
    private_metrics?: {
      transient_density: number | null;
      transient_density_std: number | null;
      transient_density_cv: number | null;
    };
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
    structure?: StructureAnalysisV1;
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

