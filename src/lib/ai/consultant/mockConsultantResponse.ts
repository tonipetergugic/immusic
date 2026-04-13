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
    selection_mode?: "only_match" | "priority_match" | "fallback_unclear" | null
    next_action?:
      | "increase_section_contrast"
      | "add_or_strengthen_structural_change"
      | "preserve_structure_refine_details"
      | "review_structure_manually"
      | null
    supporting_conditions?: string[] | null
    open_counterarguments?: string[] | null
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
  selected_branch_passed_conditions?: string[] | null
  selected_branch_failed_conditions?: string[] | null
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
  const selectionMode =
    typeof decision?.selection_mode === "string" && decision.selection_mode.trim().length > 0
      ? decision.selection_mode.trim()
      : null
  const decisionSupportingConditions = Array.isArray(decision?.supporting_conditions)
    ? decision.supporting_conditions.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []
  const decisionOpenCounterarguments = Array.isArray(decision?.open_counterarguments)
    ? decision.open_counterarguments.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []
  const evidence = consultantPayload?.evidence ?? null
  const thresholdProfileSource = consultantPayload?.threshold_profile_source ?? null
  const selectedBranchReason = consultantPayload?.selected_branch_reason ?? null
  const selectedBranchPassedConditions = Array.isArray(
    consultantPayload?.selected_branch_passed_conditions
  )
    ? consultantPayload.selected_branch_passed_conditions.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []
  const selectedBranchFailedConditions = Array.isArray(
    consultantPayload?.selected_branch_failed_conditions
  )
    ? consultantPayload.selected_branch_failed_conditions.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []
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

  const repetitiveMatched = branchResults?.repetitive?.matched === true
  const underdevelopedMatched = branchResults?.underdeveloped?.matched === true
  const balancedMatched = branchResults?.balanced?.matched === true

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

  const useSelectedBranchConditions =
    selectedBranchPassedConditions.length > 0 || selectedBranchFailedConditions.length > 0

  const fallbackSupportingConditions = useSelectedBranchConditions
    ? selectedBranchPassedConditions
    : Array.isArray(activeBranchResult?.passed_conditions)
      ? activeBranchResult.passed_conditions.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : []

  const fallbackOpenCounterarguments = useSelectedBranchConditions
    ? selectedBranchFailedConditions
    : Array.isArray(activeBranchResult?.failed_conditions)
      ? activeBranchResult.failed_conditions.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : []

  const supportingConditions =
    decisionSupportingConditions.length > 0
      ? decisionSupportingConditions
      : fallbackSupportingConditions

  const openCounterarguments =
    decisionOpenCounterarguments.length > 0 ? decisionOpenCounterarguments : fallbackOpenCounterarguments

  const supportingPreview = compactConditionList(supportingConditions, 3)
  const counterargumentsPreview = compactConditionList(openCounterarguments, 2)

  if (declaredGenre || activeGenreProfile) {
    lines.push(
      `Context: declared genre ${declaredGenre ?? "unknown"}${activeGenreProfile ? ` (${activeGenreProfile})` : ""}.`
    )
  }

  if (decision?.status === "balanced") {
    if (selectionMode === "only_match") {
      lines.push(
        "Structure summary: this suggests the arrangement already reads as fairly balanced on the current evidence, without treating that as a final verdict."
      )
    } else if (selectionMode === "priority_match") {
      lines.push(
        "Structure summary: balance is the prioritized read even though other branches showed overlap—describe strengths without erasing competing signals."
      )
    } else if (selectionMode === "fallback_unclear") {
      lines.push(
        "Structure summary: the current signal mix is too soft to claim a settled balance read; keep the picture tentative and evidence-led."
      )
    } else {
      lines.push("Structure summary: this suggests the arrangement is already fairly balanced.")
    }
  } else if (decision?.status === "repetitive") {
    if (selectionMode === "only_match") {
      lines.push(
        "Structure summary: repetition stands out as the main structural tension in this pass, framed directionally rather than as an absolute flaw."
      )
    } else if (selectionMode === "priority_match") {
      lines.push(
        "Structure summary: repetition is the prioritized narrative, but competing branches mean borderline evidence should stay in the conversation."
      )
    } else if (selectionMode === "fallback_unclear") {
      lines.push(
        "Structure summary: repetition is not a settled call here—the overall structural picture should be described as still open and inconclusive."
      )
    } else {
      lines.push("Structure summary: this suggests repetition may currently limit forward movement.")
    }
  } else if (decision?.status === "underdeveloped") {
    if (selectionMode === "only_match") {
      lines.push(
        "Structure summary: this indicates the track may benefit from clearer structural development, framed as a practical next step rather than a harsh judgment."
      )
    } else if (selectionMode === "priority_match") {
      lines.push(
        "Structure summary: underdevelopment is the lead interpretation while other branches still flicker—call out growth opportunities alongside those tensions."
      )
    } else if (selectionMode === "fallback_unclear") {
      lines.push(
        "Structure summary: it is premature to insist the arrangement is underdeveloped; the evidence is mixed about how much structural change is really needed."
      )
    } else {
      lines.push("Structure summary: this indicates the track may benefit from stronger structural change.")
    }
  } else if (decision?.status === "unclear") {
    if (selectionMode === "fallback_unclear") {
      lines.push(
        "Structure summary: the current signal mix remains inconclusive, so any structural label should sound provisional rather than decisive."
      )
    } else {
      lines.push("Structure summary: signals are mixed, so the interpretation should stay cautious.")
    }
  }

  if (supportingPreview) {
    lines.push(
      `Decision audit: supporting checks (${supportingPreview}) help explain why this structural direction is plausible on the supplied rule evidence.`
    )
  }

  if (counterargumentsPreview) {
    if (selectionMode === "only_match") {
      lines.push(
        `Decision audit: open checks (${counterargumentsPreview}) still sit on the table, so keep the wording measured rather than absolute.`
      )
    } else {
      lines.push(
        `Decision audit: open checks (${counterargumentsPreview}) argue against overstating the verdict—describe structure as contested, not sealed shut.`
      )
    }
  }

  const humanizedThresholdProfileSource = humanizeToken(thresholdProfileSource)
  const humanizedSelectedBranchReason = humanizeToken(selectedBranchReason)

  if (humanizedThresholdProfileSource || humanizedSelectedBranchReason) {
    lines.push(
      `Decision audit: the current read uses ${humanizedThresholdProfileSource ?? "the active"} threshold profile${humanizedSelectedBranchReason ? ` and points mainly to ${humanizedSelectedBranchReason}` : ""}.`
    )
  }

  if (selectionMode === "only_match") {
    lines.push(
      "Decision audit: with a single clear rule match, the read may be stated somewhat more plainly while staying genre-relative and non-absolute."
    )
  } else if (selectionMode === "priority_match") {
    lines.push(
      "Decision audit: multiple branches had signals, so this reflects a priority pick—keep competing cues and open counter-arguments visible."
    )
  } else if (selectionMode === "fallback_unclear") {
    lines.push(
      "Decision audit: the structural verdict is intentionally soft; describe the picture as inconclusive rather than settled."
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

  if (selectionMode === "priority_match") {
    cautionSignals.push("priority-weighted choice among competing branches")
  }

  if (selectionMode === "fallback_unclear") {
    cautionSignals.push("unsettled structural read")
  }

  if (counterargumentsPreview) {
    cautionSignals.push(`open structural checks include ${counterargumentsPreview}`)
  }

  let cautionClosing =
    selectionMode === "priority_match"
      ? "Treat this as a priority-weighted read where competing signals, open counter-arguments, and borderline checks still matter."
      : selectionMode === "fallback_unclear"
        ? "Prefer tentative language—the evidence is not decisive about the overall structural picture."
        : "Treat this arrangement read as directional rather than absolute."

  if (
    counterargumentsPreview &&
    (selectionMode === "priority_match" ||
      selectionMode === "fallback_unclear" ||
      closeCallCount > 0 ||
      decision?.confidence_level === "low")
  ) {
    cautionClosing =
      `${cautionClosing} Make those open checks audible in how you hedge—especially while signals stay split or confidence is thin.`
  } else if (counterargumentsPreview) {
    cautionClosing = `${cautionClosing} Keep those open checks visible so the read never sounds ironclad.`
  }

  if (cautionSignals.length > 0) {
    lines.push(`Decision caution: ${cautionSignals.join(", ")}. ${cautionClosing}`)
  }

  if (closeCalls.length > 0) {
    const preview = closeCalls
      .slice(0, 3)
      .map((item) => humanizeToken(item) ?? item)
      .join(", ")

    lines.push(`Borderline signals: ${preview}.`)
  }

  if (branchResults?.repetitive || branchResults?.underdeveloped || branchResults?.balanced) {
    lines.push(
      `Rule snapshot: repetitive ${repetitiveMatched ? "matched" : "not matched"}, underdeveloped ${underdevelopedMatched ? "matched" : "not matched"}, balanced ${balancedMatched ? "matched" : "not matched"}.`
    )
  }

  lines.push(`Selection mode: ${selectionMode ?? "unknown"}`)

  if (supportingPreview || counterargumentsPreview) {
    lines.push("Decision conditions:")
    lines.push(`supporting: ${supportingPreview ?? "none"}`)
    lines.push(`counterarguments: ${counterargumentsPreview ?? "none"}`)
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

  const focusTail =
    selectionMode === "fallback_unclear"
      ? " Favor small, reversible tries while the structural read stays open."
      : ""

  if (decision?.next_action === "increase_section_contrast") {
    lines.push(
      `Suggested focus: increase contrast between sections so the arrangement develops more clearly.${focusTail}`
    )
  } else if (decision?.next_action === "add_or_strengthen_structural_change") {
    lines.push(
      `Suggested focus: add or strengthen structural changes between key sections.${focusTail}`
    )
  } else if (decision?.next_action === "preserve_structure_refine_details") {
    lines.push(
      `Suggested focus: preserve the structure and refine details without overcorrecting.${focusTail}`
    )
  } else if (decision?.next_action === "review_structure_manually") {
    lines.push(
      `Suggested focus: review the structure manually before making strong arrangement decisions.${focusTail}`
    )
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
      line.startsWith("Selection mode:") ||
      line.startsWith("Decision conditions:") ||
      line.startsWith("supporting:") ||
      line.startsWith("counterarguments:") ||
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
      !line.startsWith("Selection mode:") &&
      !line.startsWith("Decision conditions:") &&
      !line.startsWith("supporting:") &&
      !line.startsWith("counterarguments:") &&
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