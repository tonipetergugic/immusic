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

type DynamicsHealthLabelV1 = "healthy" | "borderline" | "over-limited";

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function computeDynamicsHealthV1(input: {
  lufs: number | null | undefined;
  lra: number | null | undefined;
  crest: number | null | undefined;
}): {
  score: number; // 0–100
  label: DynamicsHealthLabelV1;
  factors: { lufs: number | null; lra: number | null; crest: number | null };
} {
  const lufs = typeof input.lufs === "number" && Number.isFinite(input.lufs) ? input.lufs : null;
  const lra = typeof input.lra === "number" && Number.isFinite(input.lra) ? input.lra : null;
  const crest = typeof input.crest === "number" && Number.isFinite(input.crest) ? input.crest : null;

  // Festival-/Trance-Kalibrierung (Realistische Streaming-Preflight-Logik)
  // - LUFS ist Kontext (kein "Loudness-Polizei"-Gate)
  // - Crest ist Hauptindikator, LRA sekundär
  // - "Over-limited" nur bei echten Extremwert-Kombinationen

  const clamp100 = (x: number) => Math.max(0, Math.min(100, x));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

  const scoreFromRanges = (x: number, ranges: Array<[number, number, number, number]>): number => {
    // ranges: [x0, x1, y0, y1] piecewise linear
    for (const [x0, x1, y0, y1] of ranges) {
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0);
        return clamp100(lerp(y0, y1, t));
      }
    }
    // outside: clamp to nearest end
    const first = ranges[0];
    const last = ranges[ranges.length - 1];
    if (x < first[0]) return clamp100(first[2]);
    return clamp100(last[3]);
  };

  // CrestScore (0–100) – Hauptindikator
  // >=8.5 => 100
  // 7–8.5 => 85..100
  // 5.5–7 => 70..85
  // 4.5–5.5 => 45..70
  // <4.5 => 0..45
  const crestScore =
    crest === null
      ? null
      : scoreFromRanges(crest, [
          [4.5, 5.5, 45, 70],
          [5.5, 7.0, 70, 85],
          [7.0, 8.5, 85, 100],
          [8.5, 20.0, 100, 100],
        ]);

  // LRAScore (0–100)
  // >=8 => 100
  // 5–8 => 80..100
  // 3–5 => 65..80
  // 2–3 => 40..65
  // <2 => 0..40
  const lraScore =
    lra === null
      ? null
      : scoreFromRanges(lra, [
          // LRA < 2 LU soll stärker drücken: 2..3 => 30..60 (statt 40..65)
          [2.0, 3.0, 30, 60],
          [3.0, 5.0, 65, 80],
          [5.0, 8.0, 80, 100],
          [8.0, 30.0, 100, 100],
        ]);

  // LUFSScore (0–100) – nur Kontext, keine harte Strafe
  // <=-12 => 100
  // -12..-8 => 90..100
  // -8..-6 => 75..90
  // >-6 => 60..75
  const lufsScore =
    lufs === null
      ? null
      : (() => {
          if (lufs <= -12) return 100;
          if (lufs <= -8) {
            // -12..-8 => 100..90 (leicht sinkend)
            const t = (lufs - (-12)) / ((-8) - (-12));
            return clamp100(lerp(100, 90, t));
          }
          if (lufs <= -6) {
            // -8..-6 => 90..75
            const t = (lufs - (-8)) / ((-6) - (-8));
            return clamp100(lerp(90, 75, t));
          }
          // > -6 => 75..60 (aber nie "rot" allein wegen LUFS)
          // bis -3 linear abfallen
          const t = clamp01((lufs - (-6)) / ((-3) - (-6)));
          return clamp100(lerp(75, 60, t));
        })();

  // CodecImpactScore: aktuell nicht verfügbar in den Inputs -> neutral (100)
  const codecImpactScore = 100;

  // Gewichte (Festival-Kalibrierung): Crest 40%, LRA 30%, LUFS 20%, Codec 10%
  const parts: Array<{ w: number; v: number | null }> = [
    { w: 0.40, v: crestScore },
    { w: 0.30, v: lraScore },
    { w: 0.20, v: lufsScore },
    { w: 0.10, v: codecImpactScore },
  ];

  const available = parts.filter((p) => typeof p.v === "number");
  let score: number;

  if (available.length === 0) {
    // neutral, falls Metriken fehlen (kein Gate)
    score = 65; // Festival-Preflight: neutral eher "okay" als "hart"
  } else {
    const wSum = available.reduce((a, p) => a + p.w, 0);
    const vSum = available.reduce((a, p) => a + p.w * (p.v as number), 0);
    score = Math.round(vSum / wSum);
  }

  // Labeling (Festival): Healthy ab 75
  let label: DynamicsHealthLabelV1 =
    score >= 75 ? "healthy" : score >= 55 ? "borderline" : "over-limited";

  // Over-limited Override (nur bei echten Extremkombinationen)
  // Mindestens 2 von 3 Bedingungen müssen zutreffen:
  // - Crest < 4.5
  // - LRA < 2.0
  // - LUFS > -6.0 (extrem laut)
  const condCrest = crest !== null && crest < 4.5;
  const condLra = lra !== null && lra < 2.0;
  const condLufs = lufs !== null && lufs > -6.0;

  const condCount = Number(condCrest) + Number(condLra) + Number(condLufs);
  if (condCount >= 2) {
    label = "over-limited";
    if (score > 54) score = 54;
  }

  // Festival-Preflight: extrem flache Makrodynamik soll nicht als "Healthy" durchrutschen
  // LRA < 1.0 LU => maximal "borderline" (Score-Deckel unter Healthy-Schwelle)
  if (lra !== null && lra < 1.0) {
    if (score > 74) score = 74;
    if (label === "healthy") label = "borderline";
  }

  return {
    score: clamp100(score),
    label,
    factors: { lufs, lra, crest },
  };
}

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

function recommendedLimiterCeilingTextV1(codecSim: any): string | null {
  const aacPost = typeof codecSim?.aac128?.post_true_peak_db === "number" ? codecSim.aac128.post_true_peak_db : null;
  const mp3Post = typeof codecSim?.mp3128?.post_true_peak_db === "number" ? codecSim.mp3128.post_true_peak_db : null;

  if (aacPost === null && mp3Post === null) return null;

  const worstPost = Math.max(aacPost ?? -999, mp3Post ?? -999);

  // Sicherheitsmarge-Policy (Preflight, keine Sperre):
  // Wenn Post-Encode True Peak nahe 0 dBTP liegt, empfehlen wir -1.0 dBTP Ceiling.
  // "Nahe 0" definieren wir als >= -0.2 dBTP.
  if (worstPost >= -0.2) {
    return "Tip: Keep true peak ceiling around -1.0 dBTP to add streaming headroom (reduces encoding overs/distortion risk).";
  }

  return null;
}

function distortionRiskFromCodecSim(codecSim: any): { highlight: string; severity: "info" | "warn" } | null {
  if (!codecSim) return null;

  const aacRisk =
    codecSim?.aac128?.distortion_risk === "low" ||
    codecSim?.aac128?.distortion_risk === "moderate" ||
    codecSim?.aac128?.distortion_risk === "high"
      ? codecSim.aac128.distortion_risk
      : null;

  const mp3Risk =
    codecSim?.mp3128?.distortion_risk === "low" ||
    codecSim?.mp3128?.distortion_risk === "moderate" ||
    codecSim?.mp3128?.distortion_risk === "high"
      ? codecSim.mp3128.distortion_risk
      : null;

  if (aacRisk === null && mp3Risk === null) return null;

  const rank = (r: "low" | "moderate" | "high" | null): number =>
    r === "high" ? 3 : r === "moderate" ? 2 : r === "low" ? 1 : 0;

  const worstRank = Math.max(rank(aacRisk), rank(mp3Risk));

  const worstLabel =
    worstRank === 3 ? "HIGH" : worstRank === 2 ? "MODERATE" : "LOW";

  const severity: "info" | "warn" = worstRank >= 3 ? "warn" : "info";

  const aacTxt = aacRisk ? `AAC 128: ${aacRisk.toUpperCase()}` : "AAC 128: —";
  const mp3Txt = mp3Risk ? `MP3 128: ${mp3Risk.toUpperCase()}` : "MP3 128: —";

  const tip = recommendedLimiterCeilingTextV1(codecSim);

  return {
    severity,
    highlight: tip
      ? `Codec distortion risk (${worstLabel}) — ${aacTxt}, ${mp3Txt}. ${tip}`
      : `Codec distortion risk (${worstLabel}) — ${aacTxt}, ${mp3Txt}.`,
  };
}

function headroomHealthFromSourceTruePeak(truePeakDbTp: any): { highlight: string; severity: "info" | "warn" | "critical" } | null {
  const tp =
    typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp) ? truePeakDbTp : null;

  if (tp === null) return null;

  // Headroom to 0.0 dBTP at SOURCE (pre-encode). Positive means below 0.0 dBTP.
  const headroomToZero = 0.0 - tp;

  // Deterministic thresholds (purely technical, informational only):
  // - <= 0.00 dBTP: already over -> critical
  // - <= 0.10 dBTP: extremely tight -> critical
  // - <= 0.30 dBTP: tight -> warn
  // - else: info
  if (headroomToZero <= 0) {
    return {
      severity: "critical",
      highlight: `Headroom (source) is negative (${headroomToZero.toFixed(3)} dBTP): True Peak ${tp.toFixed(3)} dBTP — high encoding risk.`,
    };
  }

  if (headroomToZero <= 0.10) {
    return {
      severity: "critical",
      highlight: `Headroom (source): only ${headroomToZero.toFixed(2)} dBTP → high encoding risk (True Peak ${tp.toFixed(3)} dBTP).`,
    };
  }

  if (headroomToZero <= 0.30) {
    return {
      severity: "warn",
      highlight: `Headroom (source): ${headroomToZero.toFixed(2)} dBTP → low encoding headroom (True Peak ${tp.toFixed(3)} dBTP).`,
    };
  }

  return {
    severity: "info",
    highlight: `Headroom (source) looks healthy: ${headroomToZero.toFixed(2)} dBTP (True Peak ${tp.toFixed(3)} dBTP).`,
  };
}

function lowEndMonoStabilityHealth(params: {
  phaseCorr20_120: any;
  monoLossPct20_120: any;
}): { severity: "info" | "warn" | "critical"; highlight: string; recSeverity: "info" | "warn" | "critical" } | null {
  const pc =
    typeof params.phaseCorr20_120 === "number" && Number.isFinite(params.phaseCorr20_120)
      ? params.phaseCorr20_120
      : null;

  const loss =
    typeof params.monoLossPct20_120 === "number" && Number.isFinite(params.monoLossPct20_120)
      ? params.monoLossPct20_120
      : null;

  if (pc === null && loss === null) return null;

  // Deterministic thresholds (technical only; no gating):
  // Phase correlation (20–120 Hz): <0 critical, <0.2 high, <0.5 warn, else ok
  // Mono energy loss (20–120 Hz): >30 critical, >15 high, >5 warn, else ok
  const critical =
    (pc !== null && pc < 0) || (loss !== null && loss > 30);

  const high =
    (pc !== null && pc < 0.2) || (loss !== null && loss > 15);

  const warn =
    (pc !== null && pc < 0.5) || (loss !== null && loss > 5);

  if (critical) {
    const pcTxt = pc === null ? "—" : pc.toFixed(2);
    const lossTxt = loss === null ? "—" : `${loss.toFixed(1)}%`;
    return {
      severity: "critical",
      recSeverity: "critical",
      highlight: `Low-end mono stability (20–120 Hz) is CRITICAL: phase corr ${pcTxt}, mono loss ${lossTxt} → bass may disappear on mono club systems.`,
    };
  }

  if (high) {
    const pcTxt = pc === null ? "—" : pc.toFixed(2);
    const lossTxt = loss === null ? "—" : `${loss.toFixed(1)}%`;
    return {
      severity: "warn",
      recSeverity: "warn",
      highlight: `Low-end mono stability (20–120 Hz) is HIGH RISK: phase corr ${pcTxt}, mono loss ${lossTxt} → check sub stereo/phase.`,
    };
  }

  if (warn) {
    const pcTxt = pc === null ? "—" : pc.toFixed(2);
    const lossTxt = loss === null ? "—" : `${loss.toFixed(1)}%`;
    return {
      severity: "info",
      recSeverity: "info",
      highlight: `Low-end mono stability (20–120 Hz) looks borderline: phase corr ${pcTxt}, mono loss ${lossTxt}.`,
    };
  }

  return null;
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
  lowEndPhaseCorrelation20_120?: number | null;
  lowEndMonoEnergyLossPct20_120?: number | null;
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
  shortTermLufsTimeline?: Array<{ t: number; lufs: number }> | null;
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
    lowEndPhaseCorrelation20_120 = null,
    lowEndMonoEnergyLossPct20_120 = null,
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
    shortTermLufsTimeline = null,
  } = params;

  const highlights: string[] = [];
  const recommendations: FeedbackRecommendationV2[] = [];

  const dynamicsHealth = computeDynamicsHealthV1({
    lufs: typeof integratedLufs === "number" && Number.isFinite(integratedLufs) ? integratedLufs : null,
    lra: typeof loudnessRangeLu === "number" && Number.isFinite(loudnessRangeLu) ? loudnessRangeLu : null,
    crest: typeof crestFactorDb === "number" && Number.isFinite(crestFactorDb) ? crestFactorDb : null,
  });

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

  // Phase 2: Codec Distortion Risk (derived from codec simulation, if present)
  const dr = distortionRiskFromCodecSim((params as any).codecSimulation);
  if (dr) {
    highlights.push(dr.highlight);

    // Escalate summary severity minimally (never lowers existing severity)
    if (dr.severity === "warn" && metaSeverity === "info") {
      metaSeverity = "warn";
    }

    const hasCodecRec = recommendations.some((r) => r.id === "rec_codec_distortion_risk");

    // Only recommend when worst risk is HIGH (warn). For MODERATE we only highlight.
    if (dr.severity === "warn" && !hasCodecRec) {
      recommendations.push({
        id: "rec_codec_distortion_risk",
        severity: "warn",
        title: "Reduce encoding distortion risk (codec safety)",
        why: "Some masters stay clean in WAV but distort after lossy encoding (AAC/MP3). This is purely technical and can affect streaming playback.",
        how: [
          "Increase true-peak headroom (set limiter ceiling to -1.0 dBTP recommended).",
          "Reduce aggressive limiting/soft clipping on the master to lower codec stress.",
          "Re-check post-encode True Peak and overs after adjustments.",
          "If distortion persists, reduce high-frequency harshness and extreme transient peaks.",
        ],
      });
    }
  }

  // Phase 2: Headroom Health (source / pre-encode)
  const hs = headroomHealthFromSourceTruePeak(truePeakDbTp);
  if (hs) {
    highlights.push(hs.highlight);

    // Escalate summary severity minimally (never lowers existing severity)
    if (hs.severity === "critical") {
      metaSeverity = "critical";
    } else if (hs.severity === "warn" && metaSeverity === "info") {
      metaSeverity = "warn";
    }
  }

  // Phase 2: Low-End Mono Stability (20–120 Hz) - purely technical
  const le = lowEndMonoStabilityHealth({
    phaseCorr20_120: lowEndPhaseCorrelation20_120,
    monoLossPct20_120: lowEndMonoEnergyLossPct20_120,
  });

  if (le) {
    highlights.push(le.highlight);

    // Escalate summary severity minimally (never lowers existing severity)
    if (le.severity === "critical") {
      metaSeverity = "critical";
    } else if (le.severity === "warn" && metaSeverity === "info") {
      metaSeverity = "warn";
    }

    // Add recommendation (artist-centric): show already from WARN/borderline.
    // Keep severity at least "warn" so it doesn't get lost.
    recommendations.push({
      id: "rec_low_end_mono_stability",
      severity: le.recSeverity === "critical" ? "critical" : "warn",
      title: "Check low-end mono compatibility (20–120 Hz)",
      why: "Even moderate sub stereo/phase issues can collapse in mono and reduce bass impact on club systems.",
      how: [
        "Make sub (below ~80–100 Hz) mono or near-mono.",
        "Check kick/bass phase alignment (sample-level if needed).",
        "Avoid wide stereo imaging on sub layers; use width higher up instead.",
        "Verify in mono: the drop should keep weight and not hollow out.",
      ],
    });
    if (metaSeverity === "info") metaSeverity = "warn";
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

  // Pattern 1: Over-Limited Loudness (now also driven by Dynamics Health Index)
  const dynLabel =
    dynamicsHealth?.label && typeof dynamicsHealth.label === "string"
      ? String(dynamicsHealth.label)
      : null;

  const dynOverLimited = dynLabel === "over-limited";
  const dynBorderline = dynLabel === "borderline";

  const classicOverLimitedPattern =
    typeof integratedLufs === "number" &&
    typeof loudnessRangeLu === "number" &&
    typeof truePeakDbTp === "number" &&
    integratedLufs >= -9.0 &&
    loudnessRangeLu < 2.0 &&
    truePeakDbTp > -1.0;

  if (classicOverLimitedPattern || dynOverLimited || dynBorderline) {
    const hasPatternRec = recommendations.some((r) => r.id === "rec_pattern_over_limited");

    // Keep existing safeguard for classic metric-specific recs
    const hasTruePeakRec = recommendations.some((r) => r.id === "rec_true_peak_headroom");
    const hasLraLowRec = recommendations.some((r) => r.id === "rec_lra_very_low");

    // Highlight always when dynamics signals "borderline/over-limited" OR classic pattern triggers
    if (dynOverLimited) {
      highlights.push("Dynamics Health indicates OVER-LIMITING — dynamics are extremely restricted.");
    } else if (dynBorderline) {
      highlights.push("Dynamics Health indicates borderline dynamics — limiting/compression may be reducing impact.");
    } else {
      highlights.push(
        "Compression-dominant loudness pattern detected (high loudness + very low LRA + low true-peak headroom)."
      );
    }

    // Only push the master-limiting recommendation when dynamics is clearly over-limited,
    // OR the classic pattern triggers and we don't already have the two specific recs covering it.
    const shouldPushRec =
      (!hasPatternRec) &&
      (dynOverLimited || (classicOverLimitedPattern && !(hasTruePeakRec && hasLraLowRec)));

    if (shouldPushRec) {
      recommendations.push({
        id: "rec_pattern_over_limited",
        severity: "warn",
        title: "Reduce aggressive master limiting",
        why: "This pattern indicates aggressive limiting/compression that can reduce punch and increase distortion risk after encoding.",
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

  // ---- Low-End Mono Stability (20–120 Hz) ----
  if (
    typeof lowEndMonoEnergyLossPct20_120 === "number" &&
    Number.isFinite(lowEndMonoEnergyLossPct20_120) &&
    lowEndMonoEnergyLossPct20_120 > 5
  ) {
    const lossPct = Math.round(lowEndMonoEnergyLossPct20_120);

    highlights.push(
      `Low-end mono compatibility risk (20–120 Hz): ~${lossPct}% energy loss when collapsed to mono.`
    );

    recommendations.push({
      id: "rec_low_end_mono_instability",
      severity: lossPct > 12 ? "warn" : "info",
      title: "Improve low-end mono compatibility (20–120 Hz)",
      why: `Approximately ${lossPct}% low-frequency energy is lost when summed to mono. Club and festival systems often operate mono-compatible, which may reduce bass impact.`,
      how: [
        "Collapse sub-bass below 100 Hz to mono.",
        "Use M/S EQ to narrow the sub band only.",
        "Keep stereo width mainly above 120 Hz.",
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

  const lufsI =
    typeof integratedLufs === "number" && Number.isFinite(integratedLufs) ? integratedLufs : null;

  const tpDbTp =
    typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp) ? truePeakDbTp : null;

  // Headroom to the recommended -1.0 dBTP ceiling (positive means "can turn up", negative means already above).
  const maxUpGainDb =
    tpDbTp === null ? null : Number.isFinite(-1.0 - tpDbTp) ? (-1.0 - tpDbTp) : null;

  const computeDesiredGain = (target: number) =>
    lufsI === null ? null : Number.isFinite(target - lufsI) ? (target - lufsI) : null;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const desiredSpotify = computeDesiredGain(-14);
  const desiredYouTube = computeDesiredGain(-14);
  const desiredApple = computeDesiredGain(-16);

  // Spotify: up/down, but up-gain limited by headroom to -1.0 dBTP ceiling.
  const appliedSpotify =
    desiredSpotify === null
      ? null
      : desiredSpotify <= 0
        ? desiredSpotify
        : maxUpGainDb === null
          ? desiredSpotify
          : clamp(desiredSpotify, 0, Math.max(0, maxUpGainDb));

  // YouTube: down-only (never turns up).
  const appliedYouTube =
    desiredYouTube === null ? null : Math.min(0, desiredYouTube);

  // Apple Music: up-gain limited by headroom; down works as-is.
  const appliedApple =
    desiredApple === null
      ? null
      : desiredApple <= 0
        ? desiredApple
        : maxUpGainDb === null
          ? desiredApple
          : clamp(desiredApple, 0, Math.max(0, maxUpGainDb));

  const streamingNormalization =
    lufsI === null
      ? undefined
      : {
          spotify: {
            target_lufs_i: -14,
            desired_gain_db: desiredSpotify,
            applied_gain_db: appliedSpotify,
            max_up_gain_db: maxUpGainDb,
            mode: "up_down" as const,
          },
          youtube: {
            target_lufs_i: -14,
            desired_gain_db: desiredYouTube,
            applied_gain_db: appliedYouTube,
            max_up_gain_db: null,
            mode: "down_only" as const,
          },
          apple_music: {
            target_lufs_i: -16,
            desired_gain_db: desiredApple,
            applied_gain_db: appliedApple,
            max_up_gain_db: maxUpGainDb,
            mode: "limited_up" as const,
          },
        };

  const sourceHeadroomToZeroDbTp =
    typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp) ? (0.0 - truePeakDbTp) : null;

  const aacPostTp =
    typeof (codecSimulation as any)?.aac128?.post_true_peak_db === "number" && Number.isFinite((codecSimulation as any).aac128.post_true_peak_db)
      ? (codecSimulation as any).aac128.post_true_peak_db
      : null;

  const mp3PostTp =
    typeof (codecSimulation as any)?.mp3128?.post_true_peak_db === "number" && Number.isFinite((codecSimulation as any).mp3128.post_true_peak_db)
      ? (codecSimulation as any).mp3128.post_true_peak_db
      : null;

  const worstPostTpDbTp =
    aacPostTp === null && mp3PostTp === null
      ? null
      : Math.max(aacPostTp ?? -999, mp3PostTp ?? -999);

  const postHeadroomToZeroDbTp =
    typeof worstPostTpDbTp === "number" && Number.isFinite(worstPostTpDbTp) ? (0.0 - worstPostTpDbTp) : null;

  const effectiveHeadroomDbTp =
    sourceHeadroomToZeroDbTp === null && postHeadroomToZeroDbTp === null
      ? null
      : sourceHeadroomToZeroDbTp === null
        ? postHeadroomToZeroDbTp
        : postHeadroomToZeroDbTp === null
          ? sourceHeadroomToZeroDbTp
          : Math.min(sourceHeadroomToZeroDbTp, postHeadroomToZeroDbTp);

  const headroomScoreFromEffective = (h: number | null): number | null => {
    if (h === null || !Number.isFinite(h)) return null;
    if (h < 0) return 0;
    if (h <= 0.10) return 15;
    if (h <= 0.30) return 35;
    if (h <= 0.50) return 55;
    if (h <= 0.70) return 70;
    if (h < 1.00) return 85;
    return 100;
  };

  const headroomBadgeFromScore = (s: number | null): "healthy" | "ok" | "warn" | "critical" | null => {
    if (s === null) return null;
    if (s >= 80) return "healthy";
    if (s >= 60) return "ok";
    if (s >= 35) return "warn";
    return "critical";
  };

  const headroomEngineering =
    effectiveHeadroomDbTp === null && sourceHeadroomToZeroDbTp === null && postHeadroomToZeroDbTp === null
      ? undefined
      : {
          score_0_100: headroomScoreFromEffective(effectiveHeadroomDbTp),
          badge: headroomBadgeFromScore(headroomScoreFromEffective(effectiveHeadroomDbTp)),
          effective_headroom_dbtp: effectiveHeadroomDbTp,
          source_headroom_dbtp: sourceHeadroomToZeroDbTp,
          post_encode_headroom_dbtp: postHeadroomToZeroDbTp,
          worst_post_true_peak_dbtp: worstPostTpDbTp,
        };

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
      status:
        decision === "rejected"
          ? "hard-fail"
          : metaSeverity === "warn"
            ? "approved_with_risks"
            : "approved",
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
        ...(Array.isArray(shortTermLufsTimeline) && shortTermLufsTimeline.length > 0 ? { short_term_lufs_timeline: shortTermLufsTimeline } : {}),
        ...(headroomEngineering ? { headroom_engineering: headroomEngineering } : {}),
        ...(streamingNormalization ? { streaming_normalization: streamingNormalization } : {}),
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
      low_end: {
        phase_correlation_20_120:
          typeof lowEndPhaseCorrelation20_120 === "number" && Number.isFinite(lowEndPhaseCorrelation20_120)
            ? lowEndPhaseCorrelation20_120
            : null,
        mono_energy_loss_pct_20_120:
          typeof lowEndMonoEnergyLossPct20_120 === "number" && Number.isFinite(lowEndMonoEnergyLossPct20_120)
            ? lowEndMonoEnergyLossPct20_120
            : null,
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
    dynamics_health: dynamicsHealth,
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
