export type ConsultantGoal = "club" | "streaming" | "balanced"

export type ConsultantPromptInput = {
  genre?: string | null
  goal?: ConsultantGoal | null
  // already-mapped compact metrics object (token-sparend), e.g. { LUFS, TP, LRA, PHASE, LOW_MONO, CREST, ... }
  metrics: Record<string, number | string | boolean | null | undefined>
  consultant_payload?: {
    decision?: {
      status?: string | null
      main_reason?: string | null
      next_action?: string | null
      confidence_level?: string | null
    } | null
    wording?: {
      headline_key?: string | null
      body_focus_key?: string | null
      caution_mode?: string | null
      similarity_emphasis?: string | null
    } | null
    guardrails?: {
      avoid_absolute_judgment?: boolean | null
      require_evidence_based_language?: boolean | null
      require_genre_relative_language?: boolean | null
      preserve_artistic_intent_space?: boolean | null
      preferred_phrases?: string[] | null
      forbidden_phrases?: string[] | null
      require_similarity_context_caution?: boolean | null
      require_similarity_genre_relative_language?: boolean | null
      similarity_preferred_phrases?: string[] | null
      similarity_forbidden_phrases?: string[] | null
    } | null
    genre_context?: {
      declared_main_genre?: string | null
      declared_subgenre?: string | null
      declared_reference_artist?: string | null
      declared_reference_track?: string | null
      active_genre_profile?: string | null
    } | null
    threshold_profile_source?: string | null
    selected_branch_reason?: string | null
    confidence_context?: {
      core_metric_presence_count?: number | null
      matched_branch_count?: number | null
      close_call_count?: number | null
      selected_branch_is_unclear?: boolean | null
    } | null
    close_calls?: string[] | null
    similarity_read?: string | null
    evidence?: {
      repetition_ratio_0_1?: number | null
      unique_section_count?: number | null
      transition_strength_0_1?: number | null
      novelty_change_strength_0_1?: number | null
      section_similarity_mean_0_1?: number | null
      drop_to_drop_similarity_mean_0_1?: number | null
    } | null
  } | null
}

function cleanMetrics(metrics: ConsultantPromptInput["metrics"]) {
  // remove null/undefined and non-finite numbers to avoid AI hallucinations + reduce tokens
  const out: Record<string, number | string | boolean> = {}
  for (const [k, v] of Object.entries(metrics || {})) {
    if (v === null || v === undefined) continue
    if (typeof v === "number" && !Number.isFinite(v)) continue
    out[k] = v as any
  }
  return out
}

function cleanConsultantPayload(
  payload: ConsultantPromptInput["consultant_payload"]
) {
  if (!payload || typeof payload !== "object") return null

  const out: Record<string, unknown> = {}

  for (const [sectionKey, sectionValue] of Object.entries(payload)) {
    if (!sectionValue || typeof sectionValue !== "object") continue

    const cleanedSection: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(sectionValue)) {
      if (v === null || v === undefined) continue
      if (typeof v === "number" && !Number.isFinite(v)) continue

      if (Array.isArray(v)) {
        const cleanedArray = v.filter(
          (item) =>
            item !== null &&
            item !== undefined &&
            !(typeof item === "number" && !Number.isFinite(item))
        )
        if (cleanedArray.length === 0) continue
        cleanedSection[k] = cleanedArray
        continue
      }

      cleanedSection[k] = v
    }

    if (Object.keys(cleanedSection).length > 0) {
      out[sectionKey] = cleanedSection
    }
  }

  return Object.keys(out).length > 0 ? out : null
}

function buildConsultantPayloadSummary(
  payload: ReturnType<typeof cleanConsultantPayload>
) {
  if (!payload) return null

  const lines: string[] = []

  const decision =
    payload.decision && typeof payload.decision === "object"
      ? (payload.decision as Record<string, unknown>)
      : null

  const wording =
    payload.wording && typeof payload.wording === "object"
      ? (payload.wording as Record<string, unknown>)
      : null

  const guardrails =
    payload.guardrails && typeof payload.guardrails === "object"
      ? (payload.guardrails as Record<string, unknown>)
      : null

  const genreContext =
    payload.genre_context && typeof payload.genre_context === "object"
      ? (payload.genre_context as Record<string, unknown>)
      : null

  const evidence =
    payload.evidence && typeof payload.evidence === "object"
      ? (payload.evidence as Record<string, unknown>)
      : null

  const confidenceContext =
    payload.confidence_context && typeof payload.confidence_context === "object"
      ? (payload.confidence_context as Record<string, unknown>)
      : null

  const thresholdProfileSource =
    typeof payload.threshold_profile_source === "string" &&
    payload.threshold_profile_source.trim().length > 0
      ? payload.threshold_profile_source.trim()
      : null

  const selectedBranchReason =
    typeof payload.selected_branch_reason === "string" &&
    payload.selected_branch_reason.trim().length > 0
      ? payload.selected_branch_reason.trim()
      : null

  const similarityRead =
    typeof payload.similarity_read === "string" &&
    payload.similarity_read.trim().length > 0
      ? payload.similarity_read.trim()
      : null

  const closeCalls = Array.isArray(payload.close_calls)
    ? payload.close_calls.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []

  const status =
    typeof decision?.status === "string" && decision.status.trim().length > 0
      ? decision.status.trim()
      : null

  const mainReason =
    typeof decision?.main_reason === "string" && decision.main_reason.trim().length > 0
      ? decision.main_reason.trim()
      : null

  const nextAction =
    typeof decision?.next_action === "string" && decision.next_action.trim().length > 0
      ? decision.next_action.trim()
      : null

  const confidenceLevel =
    typeof decision?.confidence_level === "string" && decision.confidence_level.trim().length > 0
      ? decision.confidence_level.trim()
      : null

  if (status || mainReason || nextAction || confidenceLevel) {
    lines.push(
      [
        "Decision Summary:",
        status ? `status=${status}` : null,
        mainReason ? `reason=${mainReason}` : null,
        nextAction ? `next_action=${nextAction}` : null,
        confidenceLevel ? `confidence=${confidenceLevel}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  if (thresholdProfileSource || selectedBranchReason || similarityRead) {
    lines.push(
      [
        "Decision Trace:",
        thresholdProfileSource ? `profile_source=${thresholdProfileSource}` : null,
        selectedBranchReason ? `selected_reason=${selectedBranchReason}` : null,
        similarityRead ? `similarity_read=${similarityRead}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  const coreMetricPresenceCount =
    typeof confidenceContext?.core_metric_presence_count === "number" &&
    Number.isFinite(confidenceContext.core_metric_presence_count)
      ? confidenceContext.core_metric_presence_count
      : null

  const matchedBranchCount =
    typeof confidenceContext?.matched_branch_count === "number" &&
    Number.isFinite(confidenceContext.matched_branch_count)
      ? confidenceContext.matched_branch_count
      : null

  const closeCallCount =
    typeof confidenceContext?.close_call_count === "number" &&
    Number.isFinite(confidenceContext.close_call_count)
      ? confidenceContext.close_call_count
      : null

  const selectedBranchIsUnclear =
    typeof confidenceContext?.selected_branch_is_unclear === "boolean"
      ? confidenceContext.selected_branch_is_unclear
      : null

  if (
    coreMetricPresenceCount !== null ||
    matchedBranchCount !== null ||
    closeCallCount !== null ||
    selectedBranchIsUnclear !== null
  ) {
    lines.push(
      [
        "Confidence Context:",
        coreMetricPresenceCount !== null
          ? `core_metrics=${coreMetricPresenceCount}`
          : null,
        matchedBranchCount !== null
          ? `matched_branches=${matchedBranchCount}`
          : null,
        closeCallCount !== null ? `close_calls=${closeCallCount}` : null,
        selectedBranchIsUnclear !== null
          ? `selected_branch_is_unclear=${selectedBranchIsUnclear ? "true" : "false"}`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  const headlineKey =
    typeof wording?.headline_key === "string" && wording.headline_key.trim().length > 0
      ? wording.headline_key.trim()
      : null

  const bodyFocusKey =
    typeof wording?.body_focus_key === "string" && wording.body_focus_key.trim().length > 0
      ? wording.body_focus_key.trim()
      : null

  const cautionMode =
    typeof wording?.caution_mode === "string" && wording.caution_mode.trim().length > 0
      ? wording.caution_mode.trim()
      : null

  if (headlineKey || bodyFocusKey || cautionMode) {
    lines.push(
      [
        "Wording Plan:",
        headlineKey ? `headline=${headlineKey}` : null,
        bodyFocusKey ? `focus=${bodyFocusKey}` : null,
        cautionMode ? `caution=${cautionMode}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  const declaredSubgenre =
    typeof genreContext?.declared_subgenre === "string" &&
    genreContext.declared_subgenre.trim().length > 0
      ? genreContext.declared_subgenre.trim()
      : null

  const declaredMainGenre =
    typeof genreContext?.declared_main_genre === "string" &&
    genreContext.declared_main_genre.trim().length > 0
      ? genreContext.declared_main_genre.trim()
      : null

  const activeGenreProfile =
    typeof genreContext?.active_genre_profile === "string" &&
    genreContext.active_genre_profile.trim().length > 0
      ? genreContext.active_genre_profile.trim()
      : null

  const declaredReferenceArtist =
    typeof genreContext?.declared_reference_artist === "string" &&
    genreContext.declared_reference_artist.trim().length > 0
      ? genreContext.declared_reference_artist.trim()
      : null

  const declaredReferenceTrack =
    typeof genreContext?.declared_reference_track === "string" &&
    genreContext.declared_reference_track.trim().length > 0
      ? genreContext.declared_reference_track.trim()
      : null

  if (
    declaredSubgenre ||
    declaredMainGenre ||
    activeGenreProfile ||
    declaredReferenceArtist ||
    declaredReferenceTrack
  ) {
    lines.push(
      [
        "Genre Context:",
        declaredSubgenre ? `subgenre=${declaredSubgenre}` : null,
        declaredMainGenre ? `main_genre=${declaredMainGenre}` : null,
        activeGenreProfile ? `profile=${activeGenreProfile}` : null,
        declaredReferenceArtist ? `reference_artist=${declaredReferenceArtist}` : null,
        declaredReferenceTrack ? `reference_track=${declaredReferenceTrack}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  const evidenceBits: string[] = []

  if (
    typeof evidence?.repetition_ratio_0_1 === "number" &&
    Number.isFinite(evidence.repetition_ratio_0_1)
  ) {
    evidenceBits.push(`repetition=${evidence.repetition_ratio_0_1.toFixed(2)}`)
  }

  if (
    typeof evidence?.unique_section_count === "number" &&
    Number.isFinite(evidence.unique_section_count)
  ) {
    evidenceBits.push(`sections=${evidence.unique_section_count.toFixed(0)}`)
  }

  if (
    typeof evidence?.transition_strength_0_1 === "number" &&
    Number.isFinite(evidence.transition_strength_0_1)
  ) {
    evidenceBits.push(`transition=${evidence.transition_strength_0_1.toFixed(2)}`)
  }

  if (
    typeof evidence?.novelty_change_strength_0_1 === "number" &&
    Number.isFinite(evidence.novelty_change_strength_0_1)
  ) {
    evidenceBits.push(`novelty=${evidence.novelty_change_strength_0_1.toFixed(2)}`)
  }

  if (
    typeof evidence?.section_similarity_mean_0_1 === "number" &&
    Number.isFinite(evidence.section_similarity_mean_0_1)
  ) {
    evidenceBits.push(
      `section_similarity=${evidence.section_similarity_mean_0_1.toFixed(2)}`
    )
  }

  if (
    typeof evidence?.drop_to_drop_similarity_mean_0_1 === "number" &&
    Number.isFinite(evidence.drop_to_drop_similarity_mean_0_1)
  ) {
    evidenceBits.push(
      `drop_similarity=${evidence.drop_to_drop_similarity_mean_0_1.toFixed(2)}`
    )
  }

  if (evidenceBits.length > 0) {
    lines.push(`Evidence: ${evidenceBits.join(" ")}`)
  }

  if (closeCalls.length > 0) {
    lines.push(`Close Calls: ${closeCalls.join(" | ")}`)
  }

  const preferredPhrases =
    Array.isArray(guardrails?.preferred_phrases)
      ? guardrails.preferred_phrases.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : []

  const forbiddenPhrases =
    Array.isArray(guardrails?.forbidden_phrases)
      ? guardrails.forbidden_phrases.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : []

  if (
    guardrails ||
    preferredPhrases.length > 0 ||
    forbiddenPhrases.length > 0
  ) {
    lines.push(
      [
        "Guardrails:",
        `avoid_absolute_judgment=${guardrails?.avoid_absolute_judgment === true ? "true" : "false"}`,
        `evidence_based_language=${guardrails?.require_evidence_based_language === true ? "true" : "false"}`,
        `genre_relative_language=${guardrails?.require_genre_relative_language === true ? "true" : "false"}`,
        `preserve_artistic_intent=${guardrails?.preserve_artistic_intent_space === true ? "true" : "false"}`,
        preferredPhrases.length > 0 ? `preferred=${preferredPhrases.join(" | ")}` : null,
        forbiddenPhrases.length > 0 ? `forbidden=${forbiddenPhrases.join(" | ")}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  return lines.length > 0 ? lines.join("\n") : null
}

export function buildConsultantPrompt(input: ConsultantPromptInput) {
  const genre = input.genre ?? "unknown"
  const goal: ConsultantGoal = (input.goal ?? "balanced") as ConsultantGoal

  // SYSTEM prompt stays stable (per PDF)
  const system = [
    "You are a professional mastering engineer with 20+ years of experience.",
    "You analyze technical mix/mastering metrics and explain them to an experienced producer.",
    "You may receive a structured consultant payload that already contains an internal decision, wording plan, guardrails, genre context, and evidence.",
    "Rules:",
    "- Be concise and practical.",
    "- Only comment on metrics that matter.",
    "- Ignore values that are normal.",
    "- Give real-world mastering advice.",
    "- Mention differences between club playback and streaming platforms when relevant.",
    "- Never invent data.",
    "- Do not explain basic audio theory.",
    "- Output plain text. No markdown.",
    "- Treat the structured consultant payload as the primary interpretation layer when present.",
    "- Use metrics as supporting evidence, not as a reason to contradict the provided decision without clear evidence.",
    "- Do not make absolute judgments.",
    "- Use evidence-based language.",
    "- Use genre-relative language when genre context is present.",
    "- Leave room for artistic intent."
  ].join("\n")

  // CONTEXT block (per PDF)
  const context = [
    `Track Context`,
    `Genre: ${genre}`,
    `Goal: ${goal}`,
    "Interpret the metrics from a professional mastering perspective.",
    "When structured consultant payload is present, prioritize its decision, wording, guardrails, and genre context.",
    "Use phrasing that stays cautious, evidence-based, and genre-relative.",
    "Do not present subjective creative judgments as objective truth."
  ].join("\n")

  // METRICS input (minimal, token-sparend)
  const metrics = JSON.stringify(cleanMetrics(input.metrics))
  const consultantPayload = cleanConsultantPayload(input.consultant_payload)
  const consultantPayloadSummary = buildConsultantPayloadSummary(consultantPayload)

  // RESPONSE format (per PDF)
  const format = [
    "Respond in this structure:",
    "Problem:",
    "Why it matters:",
    "Recommendation:",
    "",
    "Writing constraints:",
    "- If structured consultant payload is present, align with its decision and wording plan.",
    "- Prefer phrases such as: this suggests, this indicates, for the declared genre, may benefit from, could be strengthened by.",
    "- Avoid phrases such as: this is wrong, this is bad, this is boring, this is objectively better, this proves.",
    "- Keep the wording artist-respectful and allow room for artistic intent."
  ].join("\n")

  const user = [
    context,
    ...(consultantPayloadSummary
      ? [
          "",
          "Structured Consultant Summary:",
          consultantPayloadSummary,
        ]
      : []),
    ...(consultantPayload
      ? [
          "",
          "Structured Consultant Payload:",
          JSON.stringify(consultantPayload),
        ]
      : []),
    "",
    "Metrics:",
    metrics,
    "",
    format
  ].join("\n")

  return { system, user }
}
