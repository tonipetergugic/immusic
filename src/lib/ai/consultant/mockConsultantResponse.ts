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
  evidence?: {
    repetition_ratio_0_1?: number | null
    unique_section_count?: number | null
    transition_strength_0_1?: number | null
    novelty_change_strength_0_1?: number | null
  } | null
}

function fmt(n: number | null | undefined, digits = 1) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null
  return n.toFixed(digits)
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

  return { explanation: lines.join(" ") }
}