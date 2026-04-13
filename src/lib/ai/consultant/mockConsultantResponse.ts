type ConsultantMetrics = {
  LUFS?: number | null
  TP?: number | null
  LRA?: number | null
  CREST?: number | null
  PHASE?: number | null
  LOW_MONO?: number | null

  WIDTH?: number | null
  MID_RMS?: number | null
  SIDE_RMS?: number | null

  ATTACK?: number | null
  DENSITY?: number | null

  SUB_RMS?: number | null
  MID_RMS_SPEC?: number | null
  AIR_RMS?: number | null
}

type MockConsultantPayload = {
  decision?: {
    status?: "balanced" | "repetitive" | "underdeveloped" | "unclear" | null
    main_reason?:
      | "high_repetition_low_novelty"
      | "low_section_count_weak_transitions"
      | "healthy_variation_and_transitions"
      | "mixed_or_insufficient_signals"
      | null
    next_action?:
      | "increase_section_contrast"
      | "add_or_strengthen_structural_change"
      | "preserve_structure_refine_details"
      | "review_structure_manually"
      | null
    confidence_level?: "high" | "medium" | "low" | null
  } | null
  wording?: {
    caution_mode?: "low" | "medium" | "high" | null
    similarity_emphasis?:
      | "highlight_repetition_patterns"
      | "highlight_balanced_patterns"
      | "highlight_mixed_patterns"
      | "highlight_missing_similarity_context"
      | null
  } | null
  genre_context?: {
    declared_main_genre?: string | null
    declared_subgenre?: string | null
    declared_reference_artist?: string | null
    declared_reference_track?: string | null
    active_genre_profile?:
      | "trance_like"
      | "techno_like"
      | "house_edm_like"
      | "bass_music_like"
      | "hard_dance_like"
      | "pop_urban_like"
      | "rock_metal_like"
      | "other_like"
      | "unknown"
      | null
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
  similarity_read?:
    | "pattern_reinforces_repetition"
    | "pattern_supports_balance"
    | "pattern_is_mixed"
    | "pattern_signal_missing"
    | null
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
}

function fmt(n: number | null | undefined, digits = 1) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null
  return n.toFixed(digits)
}

function humanizeToken(value: string | null | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) return null
  return value.trim().replace(/_/g, " ")
}

function stripLeadLabel(line: string) {
  return line.replace(/^[^:]+:\s*/, "").trim()
}

function compactConditionList(values: string[] | null | undefined, limit = 3) {
  if (!Array.isArray(values)) return null

  const cleaned = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .slice(0, limit)
    .map((value) => humanizeToken(value) ?? value)

  return cleaned.length > 0 ? cleaned.join(", ") : null
}

export function mockConsultantResponse(
  metrics: ConsultantMetrics,
  consultantPayload?: MockConsultantPayload | null
) {
  const lines: string[] = []

  const declaredGenre =
    typeof consultantPayload?.genre_context?.declared_subgenre === "string" &&
    consultantPayload.genre_context.declared_subgenre.trim().length > 0
      ? consultantPayload.genre_context.declared_subgenre.trim()
      : typeof consultantPayload?.genre_context?.declared_main_genre === "string" &&
          consultantPayload.genre_context.declared_main_genre.trim().length > 0
        ? consultantPayload.genre_context.declared_main_genre.trim()
        : null

  const activeGenreProfile = consultantPayload?.genre_context?.active_genre_profile ?? null
  const decision = consultantPayload?.decision ?? null
  const evidence = consultantPayload?.evidence ?? null
  const thresholdProfileSource = consultantPayload?.threshold_profile_source ?? null
  const selectedBranchReason = consultantPayload?.selected_branch_reason ?? null
  const confidenceContext = consultantPayload?.confidence_context ?? null
  const similarityRead = consultantPayload?.similarity_read ?? null
  const similarityEmphasis = consultantPayload?.wording?.similarity_emphasis ?? null
  const repetitiveThresholds = consultantPayload?.repetitive_thresholds ?? null
  const balancedThresholds = consultantPayload?.balanced_thresholds ?? null
  const underdevelopedThresholds = consultantPayload?.underdeveloped_thresholds ?? null
  const similarityThresholds = consultantPayload?.similarity_thresholds ?? null
  const branchResults = consultantPayload?.branch_results ?? null
  const closeCalls = Array.isArray(consultantPayload?.close_calls)
    ? consultantPayload.close_calls.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []

  if (declaredGenre || activeGenreProfile) {
    lines.push(
      `Context: declared genre ${declaredGenre ?? "unknown"}${activeGenreProfile ? ` (${activeGenreProfile})` : ""}.`
    )
  }

  if (decision?.status === "balanced") {
    lines.push("Structure summary: this suggests the arrangement is already fairly balanced.")
  } else if (decision?.status === "repetitive") {
    lines.push("Structure summary: this suggests repetition may currently limit forward movement.")
  } else if (decision?.status === "underdeveloped") {
    lines.push("Structure summary: this indicates the track may benefit from stronger structural change.")
  } else if (decision?.status === "unclear") {
    lines.push("Structure summary: signals are mixed, so the interpretation should stay cautious.")
  }

  const humanizedThresholdProfileSource = humanizeToken(thresholdProfileSource)
  const humanizedSelectedBranchReason = humanizeToken(selectedBranchReason)

  if (humanizedThresholdProfileSource || humanizedSelectedBranchReason) {
    lines.push(
      `Decision audit: the current read uses ${humanizedThresholdProfileSource ?? "the active"} threshold profile${humanizedSelectedBranchReason ? ` and points mainly to ${humanizedSelectedBranchReason}` : ""}.`
    )
  }

  if (similarityRead === "pattern_reinforces_repetition") {
    lines.push("Similarity read: recurring section patterns appear to reinforce repetition, but this should still be interpreted relative to the declared genre.")
  } else if (similarityRead === "pattern_supports_balance") {
    lines.push("Similarity read: the section pattern supports a more balanced structural read for the declared genre.")
  } else if (similarityRead === "pattern_is_mixed") {
    lines.push("Similarity read: the pattern is mixed, so similarity should be treated as supporting context rather than a hard verdict.")
  } else if (similarityRead === "pattern_signal_missing") {
    lines.push("Similarity read: there is not enough similarity context to lean on this signal strongly.")
  }

  if (similarityEmphasis === "highlight_repetition_patterns") {
    lines.push("Pattern focus: repetition-like pattern carryover looks worth checking more closely across comparable sections.")
  } else if (similarityEmphasis === "highlight_balanced_patterns") {
    lines.push("Pattern focus: the arrangement seems to keep enough structural contrast between comparable sections.")
  } else if (similarityEmphasis === "highlight_mixed_patterns") {
    lines.push("Pattern focus: some pattern cues point in different directions, so the structural read should stay measured.")
  } else if (similarityEmphasis === "highlight_missing_similarity_context") {
    lines.push("Pattern focus: similarity context is limited, so arrangement interpretation should rely more on the broader evidence set.")
  }

  const closeCallCount =
    typeof confidenceContext?.close_call_count === "number" &&
    Number.isFinite(confidenceContext.close_call_count)
      ? confidenceContext.close_call_count
      : closeCalls.length

  const selectedBranchIsUnclear = confidenceContext?.selected_branch_is_unclear === true

  const cautionSignals: string[] = []

  if (decision?.confidence_level === "low") {
    cautionSignals.push("low confidence")
  }

  if (selectedBranchIsUnclear) {
    cautionSignals.push("unclear selected branch")
  }

  if (closeCallCount > 0) {
    cautionSignals.push(`${closeCallCount} close call${closeCallCount === 1 ? "" : "s"}`)
  }

  if (cautionSignals.length > 0) {
    lines.push(
      `Decision caution: ${cautionSignals.join(", ")}. Treat this arrangement read as directional rather than absolute.`
    )
  }

  if (closeCalls.length > 0) {
    const preview = closeCalls
      .slice(0, 3)
      .map((item) => humanizeToken(item) ?? item)
      .join(", ")

    lines.push(`Borderline signals: ${preview}.`)
  }

  const repetitiveMatched = branchResults?.repetitive?.matched === true
  const underdevelopedMatched = branchResults?.underdeveloped?.matched === true
  const balancedMatched = branchResults?.balanced?.matched === true

  if (branchResults?.repetitive || branchResults?.underdeveloped || branchResults?.balanced) {
    lines.push(
      `Rule snapshot: repetitive ${repetitiveMatched ? "matched" : "not matched"}, underdeveloped ${underdevelopedMatched ? "matched" : "not matched"}, balanced ${balancedMatched ? "matched" : "not matched"}.`
    )
  }

  const activeRuleBranch =
    decision?.status === "repetitive" || decision?.status === "underdeveloped" || decision?.status === "balanced"
      ? decision.status
      : repetitiveMatched
        ? "repetitive"
        : underdevelopedMatched
          ? "underdeveloped"
          : balancedMatched
            ? "balanced"
            : null

  const activeBranchResult =
    activeRuleBranch === "repetitive"
      ? branchResults?.repetitive
      : activeRuleBranch === "underdeveloped"
        ? branchResults?.underdeveloped
        : activeRuleBranch === "balanced"
          ? branchResults?.balanced
          : null

  const passedConditionPreview = compactConditionList(activeBranchResult?.passed_conditions, 3)
  const failedConditionPreview = compactConditionList(activeBranchResult?.failed_conditions, 2)

  if (activeRuleBranch && (passedConditionPreview || failedConditionPreview)) {
    const conditionBits: string[] = []

    if (passedConditionPreview) {
      conditionBits.push(`passed ${passedConditionPreview}`)
    }

    if (failedConditionPreview) {
      conditionBits.push(`failed ${failedConditionPreview}`)
    }

    lines.push(`Matched branch conditions: ${activeRuleBranch} -> ${conditionBits.join("; ")}.`)
  }

  const activeThresholdBits: string[] = []

  if (activeRuleBranch === "repetitive") {
    const repetitionMin = fmt(repetitiveThresholds?.repetition_min, 2)
    const noveltyMax = fmt(repetitiveThresholds?.novelty_max, 2)
    const sectionSimilarityMin = fmt(similarityThresholds?.repetitive?.section_similarity_mean_min, 2)
    const dropSimilarityMin = fmt(similarityThresholds?.repetitive?.drop_to_drop_similarity_mean_min, 2)

    if (repetitionMin) activeThresholdBits.push(`repetition >= ${repetitionMin}`)
    if (noveltyMax) activeThresholdBits.push(`novelty <= ${noveltyMax}`)
    if (sectionSimilarityMin) activeThresholdBits.push(`section similarity >= ${sectionSimilarityMin}`)
    if (dropSimilarityMin) activeThresholdBits.push(`drop similarity >= ${dropSimilarityMin}`)
  }

  if (activeRuleBranch === "underdeveloped") {
    const sectionCountMax = fmt(underdevelopedThresholds?.unique_section_count_max, 0)
    const transitionMax = fmt(underdevelopedThresholds?.transition_max, 2)
    const noveltyMax = fmt(underdevelopedThresholds?.novelty_max, 2)

    if (sectionCountMax) activeThresholdBits.push(`sections <= ${sectionCountMax}`)
    if (transitionMax) activeThresholdBits.push(`transition <= ${transitionMax}`)
    if (noveltyMax) activeThresholdBits.push(`novelty <= ${noveltyMax}`)
  }

  if (activeRuleBranch === "balanced") {
    const repetitionMax = fmt(balancedThresholds?.repetition_max, 2)
    const noveltyMin = fmt(balancedThresholds?.novelty_min, 2)
    const transitionMin = fmt(balancedThresholds?.transition_min, 2)
    const sectionSimilarityMax = fmt(similarityThresholds?.balanced?.section_similarity_mean_max, 2)
    const dropSimilarityMax = fmt(similarityThresholds?.balanced?.drop_to_drop_similarity_mean_max, 2)

    if (repetitionMax) activeThresholdBits.push(`repetition <= ${repetitionMax}`)
    if (noveltyMin) activeThresholdBits.push(`novelty >= ${noveltyMin}`)
    if (transitionMin) activeThresholdBits.push(`transition >= ${transitionMin}`)
    if (sectionSimilarityMax) activeThresholdBits.push(`section similarity <= ${sectionSimilarityMax}`)
    if (dropSimilarityMax) activeThresholdBits.push(`drop similarity <= ${dropSimilarityMax}`)
  }

  if (activeRuleBranch && activeThresholdBits.length > 0) {
    lines.push(`Active thresholds: ${activeThresholdBits.join(", ")}.`)
  }

  if (evidence) {
    const bits: string[] = []

    if (typeof evidence.repetition_ratio_0_1 === "number" && Number.isFinite(evidence.repetition_ratio_0_1)) {
      bits.push(`repetition ${evidence.repetition_ratio_0_1.toFixed(2)}`)
    }

    if (typeof evidence.unique_section_count === "number" && Number.isFinite(evidence.unique_section_count)) {
      bits.push(`sections ${evidence.unique_section_count.toFixed(0)}`)
    }

    if (typeof evidence.transition_strength_0_1 === "number" && Number.isFinite(evidence.transition_strength_0_1)) {
      bits.push(`transition ${evidence.transition_strength_0_1.toFixed(2)}`)
    }

    if (typeof evidence.novelty_change_strength_0_1 === "number" && Number.isFinite(evidence.novelty_change_strength_0_1)) {
      bits.push(`novelty ${evidence.novelty_change_strength_0_1.toFixed(2)}`)
    }

    if (
      typeof evidence.section_similarity_mean_0_1 === "number" &&
      Number.isFinite(evidence.section_similarity_mean_0_1)
    ) {
      bits.push(`section similarity ${evidence.section_similarity_mean_0_1.toFixed(2)}`)
    }

    if (
      typeof evidence.drop_to_drop_similarity_mean_0_1 === "number" &&
      Number.isFinite(evidence.drop_to_drop_similarity_mean_0_1)
    ) {
      bits.push(`drop similarity ${evidence.drop_to_drop_similarity_mean_0_1.toFixed(2)}`)
    }

    if (bits.length > 0) {
      lines.push(`Structure evidence: ${bits.join(", ")}.`)
    }
  }

  if (decision?.next_action === "increase_section_contrast") {
    lines.push("Suggested focus: increase contrast between sections so the arrangement develops more clearly.")
  } else if (decision?.next_action === "add_or_strengthen_structural_change") {
    lines.push("Suggested focus: add or strengthen structural changes between key sections.")
  } else if (decision?.next_action === "preserve_structure_refine_details") {
    lines.push("Suggested focus: preserve the structure and refine details without overcorrecting.")
  } else if (decision?.next_action === "review_structure_manually") {
    lines.push("Suggested focus: review the structure manually before making strong arrangement decisions.")
  }

  const lufs = fmt(metrics.LUFS, 1)
  const tp = fmt(metrics.TP, 2)
  const lra = fmt(metrics.LRA, 1)

  // Loudness
  if (lufs) {
    const n = Number(lufs)
    if (n > -9) lines.push(`Loudness is strong (${lufs} LUFS). That can hit hard, but watch streaming turn-down and limiter stress.`)
    else if (n < -14) lines.push(`Loudness is quite conservative (${lufs} LUFS). That can preserve punch, but may feel quieter next to references.`)
    else lines.push(`Loudness sits in a healthy range (${lufs} LUFS). Good balance of impact and headroom.`)
  } else {
    lines.push("Loudness: no integrated value provided.")
  }

  // True Peak
  if (tp) {
    const tpNum = Number(tp)
    if (tpNum > -0.5) {
      lines.push(`True peak is very close to 0 dBTP (${tp} dBTP). For safer streaming, set a limiter ceiling around -0.8 dBTP.`)
    } else if (tpNum > -1.2) {
      lines.push(`True peak is fairly tight (${tp} dBTP). Consider -1.0 to -0.8 dBTP if you want extra codec safety.`)
    } else {
      lines.push(`True peak looks safe (${tp} dBTP). Nice headroom for encoding and playback.`)
    }
  } else {
    lines.push("True peak: no value provided.")
  }

  // Dynamics (LRA)
  if (lra) {
    const lraNum = Number(lra)
    if (lraNum < 2.0) {
      lines.push(`Dynamics are very tight (LRA ~${lra} LU). Great for club consistency, but can feel flat on streaming if over-limited.`)
    } else if (lraNum > 6.0) {
      lines.push(`Dynamics are wide (LRA ~${lra} LU). Musical and open, but check loudness consistency in dense sections.`)
    } else {
      lines.push(`Dynamics look balanced (LRA ~${lra} LU). Good mix of punch and movement.`)
    }
  } else {
    lines.push("Dynamics: no LRA value provided.")
  }

  // Stereo phase
  const phase = metrics.PHASE
  if (typeof phase === "number" && Number.isFinite(phase)) {
    if (phase < 0.2) lines.push("Stereo phase: low correlation — mono compatibility could be risky. Check the drop in mono.")
    else if (phase < 0.5) lines.push("Stereo phase: moderate correlation — mostly fine, but validate mono on leads and wide FX.")
    else lines.push("Stereo phase: correlation looks healthy. Nice mono compatibility.")
  } else {
    lines.push("Stereo phase: no value provided.")
  }

  // Low-end mono stability
  const lowMono = metrics.LOW_MONO
  if (typeof lowMono === "number" && Number.isFinite(lowMono)) {
    if (lowMono < 0.2) lines.push("Low-end mono: risky (20–120 Hz). Tighten stereo processing in the sub and re-check club translation.")
    else if (lowMono < 0.5) lines.push("Low-end mono: borderline. Consider mono below ~120 Hz for more reliable club playback.")
    else lines.push("Low-end mono: stable. Great foundation for club systems.")
  } else {
    lines.push("Low-end mono: no value provided.")
  }

  // Extra positive reinforcement (if many sections look good)
  const goodSignals =
    (tp ? (Number(tp) <= -1.2 ? 1 : 0) : 0) +
    (lra ? (Number(lra) >= 2.0 && Number(lra) <= 6.0 ? 1 : 0) : 0) +
    (typeof phase === "number" && phase >= 0.5 ? 1 : 0) +
    (typeof lowMono === "number" && lowMono >= 0.5 ? 1 : 0)

  if (goodSignals >= 3) {
    lines.push("Overall: a lot of fundamentals look solid — this is already close to release-ready from a technical perspective.")
  }

  const headlineLine =
    lines.find((line) => line.startsWith("Structure summary:")) ??
    "Structure summary: this suggests the current arrangement should be reviewed with caution."

  const bodyLines = lines.filter(
    (line) =>
      line.startsWith("Context:") ||
      line.startsWith("Decision audit:") ||
      line.startsWith("Similarity read:") ||
      line.startsWith("Pattern focus:") ||
      line.startsWith("Structure evidence:") ||
      line.startsWith("Rule snapshot:") ||
      line.startsWith("Matched branch conditions:") ||
      line.startsWith("Active thresholds:")
  )

  const focusLines = lines.filter((line) => line.startsWith("Suggested focus:"))

  const cautionLines = lines.filter(
    (line) =>
      line.startsWith("Decision caution:") ||
      line.startsWith("Borderline signals:")
  )

  const technicalLines = lines.filter(
    (line) =>
      line !== headlineLine &&
      !line.startsWith("Context:") &&
      !line.startsWith("Decision audit:") &&
      !line.startsWith("Similarity read:") &&
      !line.startsWith("Pattern focus:") &&
      !line.startsWith("Structure evidence:") &&
      !line.startsWith("Rule snapshot:") &&
      !line.startsWith("Matched branch conditions:") &&
      !line.startsWith("Active thresholds:") &&
      !line.startsWith("Suggested focus:") &&
      !line.startsWith("Decision caution:") &&
      !line.startsWith("Borderline signals:")
  )

  const sections: string[] = []

  sections.push(`Headline: ${stripLeadLabel(headlineLine)}`)

  if (bodyLines.length > 0) {
    sections.push(`Body: ${bodyLines.map(stripLeadLabel).join(" ")}`)
  }

  if (focusLines.length > 0) {
    sections.push(`Focus: ${focusLines.map(stripLeadLabel).join(" ")}`)
  }

  if (cautionLines.length > 0) {
    sections.push(`Caution: ${cautionLines.map(stripLeadLabel).join(" ")}`)
  }

  if (technicalLines.length > 0) {
    sections.push(technicalLines.join("\n"))
  }

  return { explanation: sections.join("\n\n") }
}