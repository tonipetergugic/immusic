export type ArtistDecisionPayloadStatus = "pass" | "check" | "attention";

export type ArtistDecisionTechnicalCheck = {
  label: string;
  status: ArtistDecisionPayloadStatus;
  message: string;
};

export type ArtistDecisionScoreCardKey =
  | "repetition"
  | "contrast"
  | "transition";

export type ArtistDecisionScoreCard = {
  key: ArtistDecisionScoreCardKey;
  label: string;
  score: number | null;
  explanation: string;
  practical_hint: string;
  status: ArtistDecisionPayloadStatus;
};

export type ArtistDecisionPayload = {
  summary: string;
  what_works_well: string[];
  what_may_be_worth_checking: string[];
  score_cards: ArtistDecisionScoreCard[];
  structure_movement: {
    main_message: string;
    supporting_points: string[];
  };
  technical_release_checks: ArtistDecisionTechnicalCheck[];
  next_step: string;
};

type JsonRecord = Record<string, unknown>;

const FALLBACK_ARTIST_DECISION_PAYLOAD: ArtistDecisionPayload = {
  summary:
    "Your track feedback is available, but there is not enough artist-facing decision data yet.",
  what_works_well: [],
  what_may_be_worth_checking: [
    "Review the detailed feedback before making release decisions.",
  ],
  score_cards: buildUnavailableScoreCards(),
  structure_movement: {
    main_message:
      "The structure needs a careful listen before a clear recommendation can be shown here.",
    supporting_points: [],
  },
  technical_release_checks: [],
  next_step:
    "Open the detailed feedback and check the main musical and technical notes.",
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function clampScore(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(1, value));
}

function buildUnavailableScoreCards(): ArtistDecisionScoreCard[] {
  return [
    {
      key: "repetition",
      label: "Repetition",
      score: null,
      explanation:
        "No reliable repetition signal is available for this track yet.",
      practical_hint:
        "Listen once and check whether important ideas return in a way that feels intentional.",
      status: "check",
    },
    {
      key: "contrast",
      label: "Contrast / Form",
      score: null,
      explanation:
        "No reliable form contrast signal is available for this track yet.",
      practical_hint:
        "Check whether the main parts feel clearly different from each other.",
      status: "check",
    },
    {
      key: "transition",
      label: "Transition",
      score: null,
      explanation:
        "No reliable transition signal is available for this track yet.",
      practical_hint:
        "Listen to the main changes and check whether they feel clear and intentional.",
      status: "check",
    },
  ];
}

function getRepetitionStatus(score: number | null): ArtistDecisionPayloadStatus {
  if (score === null) return "check";
  if (score > 0.82) return "attention";
  if (score > 0.7 || score < 0.35) return "check";
  return "pass";
}

function getContrastStatus(score: number | null): ArtistDecisionPayloadStatus {
  if (score === null) return "check";
  if (score < 0.4) return "attention";
  if (score < 0.5) return "check";
  return "pass";
}

function getTransitionStatus(score: number | null): ArtistDecisionPayloadStatus {
  if (score === null) return "check";
  if (score < 0.45) return "attention";
  if (score < 0.55) return "check";
  return "pass";
}

function buildScoreCardsFromStructure(
  structure: JsonRecord
): ArtistDecisionScoreCard[] {
  const repetitionScore = clampScore(asNumber(structure.repetition_score));
  const contrastScore = clampScore(asNumber(structure.contrast_score));
  const transitionScore = clampScore(asNumber(structure.transition_score));

  return [
    {
      key: "repetition",
      label: "Repetition",
      score: repetitionScore,
      explanation:
        "Shows how strongly arrangement material returns across the track.",
      practical_hint:
        repetitionScore !== null && repetitionScore > 0.7
          ? "Check whether repeated ideas still feel purposeful and developing."
          : repetitionScore !== null && repetitionScore < 0.35
            ? "Check whether the track has enough recognizable ideas that return."
            : "Keep the returning ideas intentional and avoid adding variation only for its own sake.",
      status: getRepetitionStatus(repetitionScore),
    },
    {
      key: "contrast",
      label: "Contrast / Form",
      score: contrastScore,
      explanation:
        "Shows how clearly the overall form creates contrast between the main parts.",
      practical_hint:
        contrastScore !== null && contrastScore < 0.5
          ? "Check whether the main parts could differ more clearly in role, energy, or arrangement."
          : "Keep the form contrast clear while preserving the track's flow.",
      status: getContrastStatus(contrastScore),
    },
    {
      key: "transition",
      label: "Transition",
      score: transitionScore,
      explanation:
        "Shows how clearly important changes appear across the arrangement.",
      practical_hint:
        transitionScore !== null && transitionScore < 0.55
          ? "Check whether the most important changes feel clear enough for a listener."
          : "The main changes seem readable; keep them clear and intentional.",
      status: getTransitionStatus(transitionScore),
    },
  ];
}

function normalizeScoreCards(value: unknown): ArtistDecisionScoreCard[] {
  if (!Array.isArray(value)) return buildUnavailableScoreCards();

  const cards = value
    .map((item) => {
      const row = asRecord(item);
      const key = asString(row.key);
      const label = asString(row.label);
      const explanation = asString(row.explanation);
      const practicalHint = asString(row.practical_hint);
      const status = asString(row.status);
      const score = clampScore(asNumber(row.score));

      if (
        key !== "repetition" &&
        key !== "contrast" &&
        key !== "transition"
      ) {
        return null;
      }

      if (!label || !explanation || !practicalHint) return null;

      if (status !== "pass" && status !== "check" && status !== "attention") {
        return null;
      }

      return {
        key,
        label,
        score,
        explanation,
        practical_hint: practicalHint,
        status,
      };
    })
    .filter((item): item is ArtistDecisionScoreCard => Boolean(item));

  return cards.length > 0 ? cards : buildUnavailableScoreCards();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeTechnicalChecks(value: unknown): ArtistDecisionTechnicalCheck[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const row = asRecord(item);
      const label = asString(row.label);
      const message = asString(row.message);
      const status = asString(row.status);

      if (!label || !message) return null;

      if (status !== "pass" && status !== "check" && status !== "attention") {
        return null;
      }

      return {
        label,
        status,
        message,
      };
    })
    .filter((item): item is ArtistDecisionTechnicalCheck => Boolean(item));
}

function normalizeArtistDecisionPayload(value: unknown): ArtistDecisionPayload | null {
  const payload = asRecord(value);

  const summary = asString(payload.summary);
  const structureMovement = asRecord(payload.structure_movement);
  const mainMessage = asString(structureMovement.main_message);
  const nextStep = asString(payload.next_step);

  if (!summary || !mainMessage || !nextStep) return null;

  return {
    summary,
    what_works_well: asStringArray(payload.what_works_well),
    what_may_be_worth_checking: asStringArray(payload.what_may_be_worth_checking),
    score_cards: normalizeScoreCards(payload.score_cards),
    structure_movement: {
      main_message: mainMessage,
      supporting_points: asStringArray(structureMovement.supporting_points),
    },
    technical_release_checks: normalizeTechnicalChecks(
      payload.technical_release_checks
    ),
    next_step: nextStep,
  };
}

function buildTechnicalChecksFromMetrics(
  technicalMetrics: JsonRecord
): ArtistDecisionTechnicalCheck[] {
  const checks: ArtistDecisionTechnicalCheck[] = [];

  const loudness = asRecord(technicalMetrics.loudness);
  const dynamics = asRecord(technicalMetrics.dynamics);
  const stereo = asRecord(technicalMetrics.stereo);
  const lowEnd = asRecord(technicalMetrics.low_end);

  const truePeak = asNumber(loudness.true_peak_dbtp);
  if (truePeak !== null && truePeak > -1) {
    checks.push({
      label: "True Peak",
      status: "check",
      message:
        "You may want to check limiter or export headroom before release.",
    });
  }

  const integratedLufs = asNumber(loudness.integrated_lufs);
  if (integratedLufs !== null && integratedLufs > -7) {
    checks.push({
      label: "Loudness",
      status: "check",
      message:
        "The master may be very loud, so it is worth checking whether the track still breathes enough.",
    });
  }

  const crestFactor = asNumber(dynamics.crest_factor_db);
  const plr = asNumber(dynamics.plr_lu);
  if (
    (crestFactor !== null && crestFactor < 6) ||
    (plr !== null && plr < 6)
  ) {
    checks.push({
      label: "Dynamics",
      status: "check",
      message:
        "The track may be strongly controlled dynamically, so check whether impact and movement still feel natural.",
    });
  }

  const phaseCorrelation = asNumber(stereo.phase_correlation);
  if (phaseCorrelation !== null && phaseCorrelation < 0.1) {
    checks.push({
      label: "Stereo",
      status: "check",
      message:
        "The stereo image may need a mono-compatibility check before release.",
    });
  }

  const lowBandPhase = asNumber(lowEnd.phase_correlation_low_band);
  const lowBandMonoLoss = asNumber(lowEnd.mono_loss_low_band_percent);
  if (
    (lowBandPhase !== null && lowBandPhase < 0.2) ||
    (lowBandMonoLoss !== null && lowBandMonoLoss > 25)
  ) {
    checks.push({
      label: "Low End",
      status: "check",
      message:
        "The low end may need a mono and phase check before release.",
    });
  }

  return checks;
}

function mapArtistFeedbackCheckStatus(value: unknown): ArtistDecisionPayloadStatus {
  const status = asString(value);

  if (status === "ok" || status === "pass") return "pass";

  if (
    status === "problem" ||
    status === "error" ||
    status === "blocked" ||
    status === "attention"
  ) {
    return "attention";
  }

  return "check";
}

function normalizeArtistFeedbackTechnicalChecks(
  value: unknown
): ArtistDecisionTechnicalCheck[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const row = asRecord(item);
      const label = asString(row.label);
      const message =
        asString(row.message) ??
        asString(row.short_text) ??
        asString(row.text);

      if (!label || !message) return null;

      return {
        label,
        status: mapArtistFeedbackCheckStatus(row.state ?? row.status),
        message,
      };
    })
    .filter((item): item is ArtistDecisionTechnicalCheck => Boolean(item));
}

function extractArtistFeedbackListeningPoints(
  value: unknown,
  maxItems = 3
): string[] {
  if (!Array.isArray(value)) return [];

  const points: string[] = [];

  for (const item of value) {
    const row = asRecord(item);
    const headline = asString(row.headline);
    const whatToListenFor = asString(row.what_to_listen_for);

    if (headline && whatToListenFor) {
      points.push(`${headline}: ${whatToListenFor}`);
    } else if (whatToListenFor) {
      points.push(whatToListenFor);
    } else if (headline) {
      points.push(headline);
    }

    if (points.length >= maxItems) break;
  }

  return points;
}

function buildFromArtistFeedbackPayload(
  feedbackPayload: JsonRecord
): ArtistDecisionPayload | null {
  const release = asRecord(feedbackPayload.release);
  const artistGuidance = asRecord(feedbackPayload.artist_guidance);
  const meta = asRecord(feedbackPayload.meta);

  const hasArtistFeedbackShape =
    asString(meta.schema) === "artist_feedback_payload" ||
    (Object.keys(release).length > 0 &&
      Object.keys(artistGuidance).length > 0 &&
      (Object.keys(asRecord(artistGuidance.structure_summary)).length > 0 ||
        Object.keys(asRecord(artistGuidance.structure_overview)).length > 0));

  if (!hasArtistFeedbackShape) return null;

  const structureSummary = asRecord(artistGuidance.structure_summary);
  const structureOverview = asRecord(artistGuidance.structure_overview);
  const technicalOverview = asRecord(artistGuidance.technical_overview);
  const mixOverview = asRecord(artistGuidance.mix_overview);
  const releaseReadiness = asRecord(release.release_readiness);

  const technicalChecks = normalizeArtistFeedbackTechnicalChecks(
    release.technical_release_checks
  );

  const whatWorksWell: string[] = [];
  const whatMayBeWorthChecking = extractArtistFeedbackListeningPoints(
    feedbackPayload.listening_guidance
  );

  if (asString(releaseReadiness.state) === "ready") {
    whatWorksWell.push(
      "No critical release issue was reported by the technical checks."
    );
  }

  if (asString(structureOverview.status) === "available") {
    whatWorksWell.push(
      "The structure overview is available and can guide a focused listening pass."
    );
  }

  if (asString(mixOverview.status) === "available") {
    whatWorksWell.push(
      "Mix translation guidance is available for focused listening."
    );
  }

  if (
    technicalChecks.some((check) => check.status !== "pass") &&
    !whatMayBeWorthChecking.includes(
      "Review the highlighted technical release checks before export."
    )
  ) {
    whatMayBeWorthChecking.push(
      "Review the highlighted technical release checks before export."
    );
  }

  const summary =
    asString(structureOverview.main_observation) ??
    asString(structureOverview.headline) ??
    asString(technicalOverview.main_observation) ??
    "The engine feedback is available and should be reviewed with your musical intention in mind.";

  const mainMessage =
    asString(structureOverview.headline) ??
    "The structure overview is available as cautious listening guidance.";

  const supportingPoints = [
    asString(structureOverview.timeline_summary),
    asString(structureOverview.listening_focus),
    asString(structureOverview.timeline_hint),
  ].filter((item): item is string => Boolean(item));

  const nextStep =
    asString(asRecord(release.next_step).text) ??
    asString(release.next_step) ??
    "Open the detailed feedback and check the main musical and technical notes.";

  return {
    summary,
    what_works_well: whatWorksWell,
    what_may_be_worth_checking: whatMayBeWorthChecking,
    score_cards: buildScoreCardsFromStructure(
      asRecord(structureSummary.raw_scores)
    ),
    structure_movement: {
      main_message: mainMessage,
      supporting_points: supportingPoints,
    },
    technical_release_checks: technicalChecks,
    next_step: nextStep,
  };
}

function buildFromNewEnginePayload(feedbackPayload: JsonRecord): ArtistDecisionPayload | null {
  const consultantInput = asRecord(feedbackPayload.consultant_input);
  const productPayload = asRecord(feedbackPayload.product_payload);

  if (Object.keys(consultantInput).length === 0 && Object.keys(productPayload).length === 0) {
    return null;
  }

  const source = Object.keys(consultantInput).length > 0
    ? consultantInput
    : productPayload;

  const structure = asRecord(source.structure);
  const technicalMetrics = asRecord(source.technical_metrics);

  const repetitionScore = asNumber(structure.repetition_score);
  const contrastScore = asNumber(structure.contrast_score);
  const transitionScore = asNumber(structure.transition_score);

  const whatWorksWell: string[] = [];
  const whatMayBeWorthChecking: string[] = [];
  const supportingPoints: string[] = [];

  if (transitionScore !== null && transitionScore >= 0.55) {
    whatWorksWell.push(
      "The main changes appear clear enough for the listener to follow."
    );
    supportingPoints.push(
      "Important changes seem to be presented with enough clarity."
    );
  }

  if (contrastScore !== null && contrastScore >= 0.5) {
    whatWorksWell.push(
      "The arrangement shows usable movement between the main parts."
    );
    supportingPoints.push(
      "The overall form seems to create some contrast across the track."
    );
  }

  if (
    repetitionScore !== null &&
    repetitionScore >= 0.35 &&
    repetitionScore <= 0.7
  ) {
    whatWorksWell.push(
      "Recurring musical material appears present without immediately dominating the whole structure."
    );
  }

  if (repetitionScore !== null && repetitionScore > 0.7) {
    whatMayBeWorthChecking.push(
      "Some musical or arrangement ideas may return often, so check whether the track still develops enough."
    );
    supportingPoints.push(
      "Some material seems to return across the track, which can be intentional but should still feel purposeful."
    );
  }

  if (contrastScore !== null && contrastScore < 0.4) {
    whatMayBeWorthChecking.push(
      "The main parts may benefit from clearer contrast or stronger development."
    );
  }

  if (transitionScore !== null && transitionScore < 0.45) {
    whatMayBeWorthChecking.push(
      "Some important changes may need to feel clearer or more intentional."
    );
  }

  const technicalChecks = buildTechnicalChecksFromMetrics(technicalMetrics);

  const hasMusicalChecks = whatMayBeWorthChecking.length > 0;
  const hasTechnicalChecks = technicalChecks.length > 0;

  const summary =
    hasMusicalChecks || hasTechnicalChecks
      ? "The track has a solid basis, with a few points worth checking before release."
      : "The track shows a usable foundation and no major artist-facing issue is highlighted by the available data.";

  const mainMessage =
    supportingPoints.length > 0
      ? "The track shows readable movement across its main parts."
      : "The available structure data does not highlight a strong artist-facing structure issue.";

  const nextStep =
    hasMusicalChecks || hasTechnicalChecks
      ? "Listen once with focus on the highlighted points, then check the technical release notes before exporting."
      : "Do one final listening pass and continue with the release preparation.";

  return {
    summary,
    what_works_well: whatWorksWell,
    what_may_be_worth_checking: whatMayBeWorthChecking,
    score_cards: buildScoreCardsFromStructure(structure),
    structure_movement: {
      main_message: mainMessage,
      supporting_points: supportingPoints,
    },
    technical_release_checks: technicalChecks,
    next_step: nextStep,
  };
}

function buildFromLegacyPayload(feedbackPayload: JsonRecord): ArtistDecisionPayload | null {
  const metrics = asRecord(feedbackPayload.metrics);
  const structure = asRecord(metrics.structure);

  const decisionSummary = asRecord(structure.decision_summary);
  const wordingPayload = asRecord(structure.wording_payload);
  const consultantPayload = asRecord(structure.consultant_payload);

  if (
    Object.keys(decisionSummary).length === 0 &&
    Object.keys(wordingPayload).length === 0 &&
    Object.keys(consultantPayload).length === 0
  ) {
    return null;
  }

  const status =
    asString(decisionSummary.status) ??
    asString(asRecord(consultantPayload.decision).status);

  const rawMainReason =
    asString(decisionSummary.main_reason) ??
    asString(asRecord(consultantPayload.decision).main_reason);

  const rawNextAction =
    asString(decisionSummary.next_action) ??
    asString(asRecord(consultantPayload.decision).next_action);

  const whatWorksWell: string[] = [];
  const whatMayBeWorthChecking: string[] = [];
  const supportingPoints: string[] = [];

  if (status === "balanced") {
    whatWorksWell.push(
      "The track appears to hold together reasonably well from the available structure signals."
    );
    supportingPoints.push(
      "The available signals suggest the main parts are relatively easy to follow."
    );
  }

  if (status === "repetitive") {
    whatMayBeWorthChecking.push(
      "Some parts may feel too similar, so check whether the track develops enough over time."
    );
  }

  if (status === "underdeveloped") {
    whatMayBeWorthChecking.push(
      "The track may benefit from clearer development between the main parts."
    );
  }

  if (
    !status ||
    status === "manual_review_needed" ||
  status === "mixed_or_insufficient_signals" ||
  rawMainReason === "mixed_or_insufficient_signals"
  ) {
    whatMayBeWorthChecking.push(
      "The available structure signals are mixed, so a careful listening review is still important."
    );
  }

  const technicalChecks = buildTechnicalChecksFromMetrics({
    loudness: metrics.loudness,
    dynamics: metrics.dynamics,
    stereo: metrics.stereo,
    low_end: metrics.low_end,
  });

  const hasChecks =
    whatMayBeWorthChecking.length > 0 || technicalChecks.length > 0;

  const summary =
    rawMainReason === "mixed_or_insufficient_signals"
      ? "The available structure signals are mixed, so treat this as a listening check rather than a fixed judgement."
      : status === "balanced"
        ? "The track shows a usable structure foundation based on the available feedback."
        : hasChecks
          ? "The track has a usable foundation, with a few points worth checking before release."
          : "The track feedback is available and should be reviewed with your musical intention in mind.";

  const mainMessage =
    rawMainReason === "mixed_or_insufficient_signals"
      ? "The structure signals are not clear enough for a strong automatic recommendation, so your listening impression matters here."
      : status === "balanced"
        ? "The track appears to show readable movement between its main parts."
        : hasChecks
          ? "The structure may need a focused listening pass before making a release decision."
          : "The available structure data should be treated as a cautious guide.";

  const nextStep =
    rawNextAction === "review_structure_manually"
      ? "Listen through the track once and check whether the main parts feel clear, intentional, and different enough."
      : "Listen through the track once and compare the feedback with your own musical intention.";

  return {
    summary,
    what_works_well: whatWorksWell,
    what_may_be_worth_checking: whatMayBeWorthChecking,
    score_cards: buildUnavailableScoreCards(),
    structure_movement: {
      main_message: mainMessage,
      supporting_points: supportingPoints,
    },
    technical_release_checks: technicalChecks,
    next_step: nextStep,
  };
}

export function buildArtistDecisionPayload(
  feedbackPayload: unknown
): ArtistDecisionPayload {
  const root = asRecord(feedbackPayload);

  const directPayload =
    normalizeArtistDecisionPayload(root.artist_decision_payload) ??
    normalizeArtistDecisionPayload(asRecord(root.metrics).artist_decision_payload);

  if (directPayload) {
    return directPayload;
  }

  const artistFeedbackPayload = buildFromArtistFeedbackPayload(root);
  if (artistFeedbackPayload) {
    return artistFeedbackPayload;
  }

  const newEnginePayload = buildFromNewEnginePayload(root);
  if (newEnginePayload) {
    return newEnginePayload;
  }

  const legacyPayload = buildFromLegacyPayload(root);
  if (legacyPayload) {
    return legacyPayload;
  }

  return FALLBACK_ARTIST_DECISION_PAYLOAD;
}
