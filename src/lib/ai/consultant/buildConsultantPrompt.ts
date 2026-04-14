export type ConsultantGoal = "club" | "streaming" | "balanced"

export type ConsultantPromptInput = {
  genre?: string | null
  goal?: ConsultantGoal | null
  language?: string | null
  // already-mapped compact metrics object (token-sparend), e.g. { LUFS, TP, LRA, PHASE, LOW_MONO, CREST, ... }
  metrics: Record<string, number | string | boolean | null | undefined>
  consultant_payload?: {
    decision?: {
      status?: string | null
      main_reason?: string | null
      selection_mode?: "only_match" | "priority_match" | "fallback_unclear"
      next_action?: string | null
      supporting_conditions?: string[] | null
      open_counterarguments?: string[] | null
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
    selected_branch_passed_conditions?: string[] | null
    selected_branch_failed_conditions?: string[] | null
    confidence_context?: {
      core_metric_presence_count?: number | null
      matched_branch_count?: number | null
      close_call_count?: number | null
      selected_branch_is_unclear?: boolean | null
    } | null
    close_calls?: string[] | null
    similarity_read?: string | null
    repetitive_thresholds?: {
      repetition_min?: number | null
      novelty_max?: number | null
    } | null
    balanced_thresholds?: {
      repetition_max?: number | null
      novelty_min?: number | null
      transition_min?: number | null
    } | null
    underdeveloped_thresholds?: {
      unique_section_count_max?: number | null
      transition_max?: number | null
      novelty_max?: number | null
    } | null
    similarity_thresholds?: {
      repetitive?: {
        section_similarity_mean_min?: number | null
        drop_to_drop_similarity_mean_min?: number | null
      } | null
      balanced?: {
        section_similarity_mean_max?: number | null
        drop_to_drop_similarity_mean_max?: number | null
      } | null
    } | null
    branch_results?: {
      repetitive?: {
        matched?: boolean | null
        passed_conditions?: string[] | null
        failed_conditions?: string[] | null
      } | null
      underdeveloped?: {
        matched?: boolean | null
        passed_conditions?: string[] | null
        failed_conditions?: string[] | null
      } | null
      balanced?: {
        matched?: boolean | null
        passed_conditions?: string[] | null
        failed_conditions?: string[] | null
      } | null
    } | null
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
    if (sectionValue === null || sectionValue === undefined) continue

    if (Array.isArray(sectionValue)) {
      const cleanedArray = sectionValue.filter(
        (item) =>
          item !== null &&
          item !== undefined &&
          !(typeof item === "number" && !Number.isFinite(item))
      )
      if (cleanedArray.length === 0) continue
      out[sectionKey] = cleanedArray
      continue
    }

    if (typeof sectionValue === "number") {
      if (!Number.isFinite(sectionValue)) continue
      out[sectionKey] = sectionValue
      continue
    }

    if (
      typeof sectionValue === "string" ||
      typeof sectionValue === "boolean"
    ) {
      out[sectionKey] = sectionValue
      continue
    }

    if (typeof sectionValue !== "object") continue

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

  const readNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null

  const readStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : []

  const branchResults =
    payload.branch_results && typeof payload.branch_results === "object"
      ? (payload.branch_results as Record<string, unknown>)
      : null

  const repetitiveBranch =
    branchResults?.repetitive && typeof branchResults.repetitive === "object"
      ? (branchResults.repetitive as Record<string, unknown>)
      : null

  const underdevelopedBranch =
    branchResults?.underdeveloped &&
    typeof branchResults.underdeveloped === "object"
      ? (branchResults.underdeveloped as Record<string, unknown>)
      : null

  const balancedBranch =
    branchResults?.balanced && typeof branchResults.balanced === "object"
      ? (branchResults.balanced as Record<string, unknown>)
      : null

  const repetitiveThresholds =
    payload.repetitive_thresholds &&
    typeof payload.repetitive_thresholds === "object"
      ? (payload.repetitive_thresholds as Record<string, unknown>)
      : null

  const balancedThresholds =
    payload.balanced_thresholds && typeof payload.balanced_thresholds === "object"
      ? (payload.balanced_thresholds as Record<string, unknown>)
      : null

  const underdevelopedThresholds =
    payload.underdeveloped_thresholds &&
    typeof payload.underdeveloped_thresholds === "object"
      ? (payload.underdeveloped_thresholds as Record<string, unknown>)
      : null

  const similarityThresholds =
    payload.similarity_thresholds &&
    typeof payload.similarity_thresholds === "object"
      ? (payload.similarity_thresholds as Record<string, unknown>)
      : null

  const repetitiveSimilarityThresholds =
    similarityThresholds?.repetitive &&
    typeof similarityThresholds.repetitive === "object"
      ? (similarityThresholds.repetitive as Record<string, unknown>)
      : null

  const balancedSimilarityThresholds =
    similarityThresholds?.balanced &&
    typeof similarityThresholds.balanced === "object"
      ? (similarityThresholds.balanced as Record<string, unknown>)
      : null

  const status =
    typeof decision?.status === "string" && decision.status.trim().length > 0
      ? decision.status.trim()
      : null

  const mainReason =
    typeof decision?.main_reason === "string" && decision.main_reason.trim().length > 0
      ? decision.main_reason.trim()
      : null

  const selectionMode =
    typeof decision?.selection_mode === "string" && decision.selection_mode.trim().length > 0
      ? decision.selection_mode.trim()
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
      ]
        .filter(Boolean)
        .join(" ")
    )
    lines.push(`Selection Mode: ${selectionMode ?? "unknown"}`)
    if (confidenceLevel) {
      lines.push(`confidence=${confidenceLevel}`)
    }
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

  const repetitiveMatched =
    typeof repetitiveBranch?.matched === "boolean" ? repetitiveBranch.matched : null

  const underdevelopedMatched =
    typeof underdevelopedBranch?.matched === "boolean"
      ? underdevelopedBranch.matched
      : null

  const balancedMatched =
    typeof balancedBranch?.matched === "boolean" ? balancedBranch.matched : null

  const matchedBranchName = repetitiveMatched
    ? "repetitive"
    : underdevelopedMatched
      ? "underdeveloped"
      : balancedMatched
        ? "balanced"
        : null

  const matchedBranchRecord =
    matchedBranchName === "repetitive"
      ? repetitiveBranch
      : matchedBranchName === "underdeveloped"
        ? underdevelopedBranch
        : matchedBranchName === "balanced"
          ? balancedBranch
          : null

  const selectedBranchPassedConditions = readStringArray(
    payload.selected_branch_passed_conditions
  )

  const selectedBranchFailedConditions = readStringArray(
    payload.selected_branch_failed_conditions
  )

  const matchedBranchPassedConditions = readStringArray(
    matchedBranchRecord?.passed_conditions
  )

  const matchedBranchFailedConditions = readStringArray(
    matchedBranchRecord?.failed_conditions
  )

  const activeThresholdBits: string[] = []

  if (matchedBranchName === "repetitive") {
    const repetitionMin = readNumber(repetitiveThresholds?.repetition_min)
    const noveltyMax = readNumber(repetitiveThresholds?.novelty_max)
    const sectionSimilarityMin = readNumber(
      repetitiveSimilarityThresholds?.section_similarity_mean_min
    )
    const dropSimilarityMin = readNumber(
      repetitiveSimilarityThresholds?.drop_to_drop_similarity_mean_min
    )

    if (repetitionMin !== null) {
      activeThresholdBits.push(`repetition_min=${repetitionMin.toFixed(2)}`)
    }
    if (noveltyMax !== null) {
      activeThresholdBits.push(`novelty_max=${noveltyMax.toFixed(2)}`)
    }
    if (sectionSimilarityMin !== null) {
      activeThresholdBits.push(
        `section_similarity_min=${sectionSimilarityMin.toFixed(2)}`
      )
    }
    if (dropSimilarityMin !== null) {
      activeThresholdBits.push(`drop_similarity_min=${dropSimilarityMin.toFixed(2)}`)
    }
  }

  if (matchedBranchName === "underdeveloped") {
    const uniqueSectionCountMax = readNumber(
      underdevelopedThresholds?.unique_section_count_max
    )
    const transitionMax = readNumber(underdevelopedThresholds?.transition_max)
    const noveltyMax = readNumber(underdevelopedThresholds?.novelty_max)

    if (uniqueSectionCountMax !== null) {
      activeThresholdBits.push(
        `unique_section_count_max=${uniqueSectionCountMax.toFixed(0)}`
      )
    }
    if (transitionMax !== null) {
      activeThresholdBits.push(`transition_max=${transitionMax.toFixed(2)}`)
    }
    if (noveltyMax !== null) {
      activeThresholdBits.push(`novelty_max=${noveltyMax.toFixed(2)}`)
    }
  }

  if (matchedBranchName === "balanced") {
    const repetitionMax = readNumber(balancedThresholds?.repetition_max)
    const noveltyMin = readNumber(balancedThresholds?.novelty_min)
    const transitionMin = readNumber(balancedThresholds?.transition_min)
    const sectionSimilarityMax = readNumber(
      balancedSimilarityThresholds?.section_similarity_mean_max
    )
    const dropSimilarityMax = readNumber(
      balancedSimilarityThresholds?.drop_to_drop_similarity_mean_max
    )

    if (repetitionMax !== null) {
      activeThresholdBits.push(`repetition_max=${repetitionMax.toFixed(2)}`)
    }
    if (noveltyMin !== null) {
      activeThresholdBits.push(`novelty_min=${noveltyMin.toFixed(2)}`)
    }
    if (transitionMin !== null) {
      activeThresholdBits.push(`transition_min=${transitionMin.toFixed(2)}`)
    }
    if (sectionSimilarityMax !== null) {
      activeThresholdBits.push(
        `section_similarity_max=${sectionSimilarityMax.toFixed(2)}`
      )
    }
    if (dropSimilarityMax !== null) {
      activeThresholdBits.push(`drop_similarity_max=${dropSimilarityMax.toFixed(2)}`)
    }
  }

  if (
    matchedBranchName ||
    repetitiveMatched !== null ||
    underdevelopedMatched !== null ||
    balancedMatched !== null
  ) {
    lines.push(
      [
        "Rule Snapshot:",
        matchedBranchName ? `matched_branch=${matchedBranchName}` : null,
        repetitiveMatched !== null
          ? `repetitive=${repetitiveMatched ? "matched" : "not_matched"}`
          : null,
        underdevelopedMatched !== null
          ? `underdeveloped=${underdevelopedMatched ? "matched" : "not_matched"}`
          : null,
        balancedMatched !== null
          ? `balanced=${balancedMatched ? "matched" : "not_matched"}`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  const useSelectedBranchConditions =
    selectedBranchPassedConditions.length > 0 ||
    selectedBranchFailedConditions.length > 0

  const fallbackSupportingConditions = useSelectedBranchConditions
    ? selectedBranchPassedConditions
    : matchedBranchPassedConditions

  const fallbackOpenCounterarguments = useSelectedBranchConditions
    ? selectedBranchFailedConditions
    : matchedBranchFailedConditions

  const decisionSupportingConditions = readStringArray(
    decision?.supporting_conditions
  )

  const decisionOpenCounterarguments = readStringArray(
    decision?.open_counterarguments
  )

  const supportingConditions =
    decisionSupportingConditions.length > 0
      ? decisionSupportingConditions
      : fallbackSupportingConditions

  const openCounterarguments =
    decisionOpenCounterarguments.length > 0
      ? decisionOpenCounterarguments
      : fallbackOpenCounterarguments

  if (supportingConditions.length > 0 || openCounterarguments.length > 0) {
    lines.push("Decision Conditions:")
    lines.push(
      `supporting: ${supportingConditions.length > 0 ? supportingConditions.join(", ") : "none"}`
    )
    lines.push(
      `counterarguments: ${openCounterarguments.length > 0 ? openCounterarguments.join(", ") : "none"}`
    )
  }

  if (activeThresholdBits.length > 0) {
    lines.push(`Active Thresholds: ${activeThresholdBits.join(" ")}`)
  }

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
  const responseLanguage =
    typeof input.language === "string" && input.language.trim().length > 0
      ? input.language.trim()
      : "English"

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
    "- Follow the requested response language while keeping the required section headings exactly in English.",
    "- Leave room for artistic intent."
  ].join("\n")

  // CONTEXT block (per PDF)
  const context = [
    `Track Context`,
    `Genre: ${genre}`,
    `Goal: ${goal}`,
    `Response language: ${responseLanguage}`,
    "You are a fair and careful music consultant.",
    "The engine provides the first structured decision. Your role is to critically review it, not to replace it with freeform taste.",
    "Treat the structured consultant payload as controlled product context and as your primary audit frame.",
    "Use it to validate the engine direction first. Only challenge it when the evidence clearly supports a careful deviation.",
    "Do not blindly override the engine and do not ignore the payload.",
    "Use selection_mode, supporting_conditions, open_counterarguments, selected_branch_reason, threshold_profile_source, confidence_context, close_calls, branch_results, and the active thresholds as mandatory interpretation anchors.",
    "Treat supporting_conditions as the conditions that actively support the current engine direction, and open_counterarguments as conditions that argue against an over-strong claim or keep alternative readings plausible.",
    "Weigh supporting_conditions against open_counterarguments visibly in your reasoning rather than treating the headline decision as self-explanatory.",
    "When open_counterarguments is non-empty, do not write as if the engine verdict were unassailable; keep the tension explicit.",
    "Especially when selection_mode is priority_match or fallback_unclear, when close_calls are present, or when confidence is lower, let open_counterarguments meaningfully shape caution, hedging, and how strongly you state the structural read.",
    "Treat selection_mode as a compact audit hint about how the final branch was chosen (only_match, priority_match, or fallback_unclear).",
    "When selection_mode is only_match, you may articulate direction somewhat more clearly, but stay evidence-based, genre-relative, and non-absolute.",
    "When selection_mode is priority_match, pay special attention to competing signals, open counter-arguments, and borderline cases already surfaced in the payload.",
    "When selection_mode is fallback_unclear, phrase especially cautiously, make uncertainty visible, and avoid sounding definitive about the structure.",
    "Treat selected_branch_passed_conditions and selected_branch_failed_conditions as the direct short audit of the finally chosen branch: read and sanity-check this pair first before digging deeper into branch_results or other auxiliary fields.",
    "If selected_branch_failed_conditions is non-empty, visibly account for those open counter-arguments in your assessment rather than glossing over them.",
    "When selected_branch_reason indicates a priority-based selection (for example repetitive priority over other matches), be extra careful to consider whether competing signals still deserve weight in your narrative.",
    "If close_calls are present, if the selected branch is unclear, or if the confidence context suggests uncertainty, reduce certainty in your wording.",
    "If you disagree with the engine direction, explicitly ground that disagreement in the provided evidence, branch checks, and thresholds.",
    "Never turn uncertainty into a hard negative judgment.",
    "Keep every conclusion relative to the declared genre and leave space for artistic intent."
  ].join("\n")

  // METRICS input (minimal, token-sparend)
  const metrics = JSON.stringify(cleanMetrics(input.metrics))
  const consultantPayload = cleanConsultantPayload(input.consultant_payload)
  const consultantPayloadSummary = buildConsultantPayloadSummary(consultantPayload)

  // RESPONSE format (per PDF)
  const format = [
    "Format:",
    "Return with these headings exactly:",
    "Headline:",
    "Body:",
    "Focus:",
    "Caution:",
    `Write the content itself in ${responseLanguage}.`,
    "Keep the headings themselves exactly in English: Headline, Body, Focus, Caution.",
    "In your wording:",
    "- treat the engine decision as the starting point",
    "- only challenge it when the provided evidence clearly supports that",
    "- in Body, frame the final chosen branch using carrying hints from supporting_conditions (and selected_branch_passed_conditions when present) while letting selection_mode subtly inform tone (without naming it mechanically unless helpful)",
    "- in Caution, reflect open counter-arguments from open_counterarguments and selected_branch_failed_conditions alongside close_calls when relevant",
    "- when open_counterarguments is non-empty, avoid unnecessarily absolute language about the structure or the engine read",
    "- in Caution, be noticeably more careful when selection_mode is priority_match or fallback_unclear",
    "- when selection_mode is fallback_unclear, avoid overly hard or definitive statements about the arrangement structure",
    "- when a priority-style selection is signaled in selected_branch_reason or when confidence is low, phrase especially cautiously",
    "- reflect uncertainty when close calls or low-confidence signals are present",
    "- keep the language genre-relative and evidence-based",
    "- avoid absolute judgments and leave room for artistic intent",
    "Do not output JSON."
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
