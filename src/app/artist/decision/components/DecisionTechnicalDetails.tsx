import type { readFeedbackState } from "@/lib/ai/track-check/read-feedback-state";
import AiConsultantCard from "../../upload/feedback/components/AiConsultantCard";

type DecisionSummaryBlock = {
  status?: string | null;
  main_reason?: string | null;
  selection_mode?: "only_match" | "priority_match" | "fallback_unclear" | null;
  next_action?: string | null;
  confidence_level?: string | null;
  supporting_conditions?: string[] | null;
  open_counterarguments?: string[] | null;
  evidence?: {
    repetition_ratio_0_1?: number | null;
    unique_section_count?: number | null;
    transition_strength_0_1?: number | null;
    novelty_change_strength_0_1?: number | null;
    section_similarity_mean_0_1?: number | null;
    drop_to_drop_similarity_mean_0_1?: number | null;
  } | null;
};

type DecisionRuleContextBlock = {
  active_genre_profile?: string | null;
  repetitive_thresholds?: {
    repetition_min?: number | null;
    novelty_max?: number | null;
  } | null;
  balanced_thresholds?: {
    repetition_max?: number | null;
    novelty_min?: number | null;
    transition_min?: number | null;
  } | null;
  underdeveloped_thresholds?: {
    unique_section_count_max?: number | null;
    transition_max?: number | null;
    novelty_max?: number | null;
  } | null;
  similarity_thresholds?: {
    repetitive?: {
      section_similarity_mean_min?: number | null;
      drop_to_drop_similarity_mean_min?: number | null;
    } | null;
    balanced?: {
      section_similarity_mean_max?: number | null;
      drop_to_drop_similarity_mean_max?: number | null;
    } | null;
  } | null;
};

type DecisionTraceBlock = {
  matched_rule_branch?: string | null;
  threshold_profile_source?: string | null;
  selected_branch_reason?: string | null;
  selected_branch_passed_conditions?: string[] | null;
  selected_branch_failed_conditions?: string[] | null;
};

type ConsultantPayloadBlock = {
  decision?: {
    status?: string | null;
    main_reason?: string | null;
    next_action?: string | null;
    confidence_level?: string | null;
  } | null;
  wording?: {
    headline_key?: string | null;
    body_focus_key?: string | null;
    caution_mode?: string | null;
  } | null;
  guardrails?: {
    avoid_absolute_judgment?: boolean | null;
    require_evidence_based_language?: boolean | null;
    require_genre_relative_language?: boolean | null;
    preserve_artistic_intent_space?: boolean | null;
    preferred_phrases?: string[] | null;
    forbidden_phrases?: string[] | null;
  } | null;
  genre_context?: {
    declared_main_genre?: string | null;
    declared_subgenre?: string | null;
    declared_reference_artist?: string | null;
    declared_reference_track?: string | null;
    active_genre_profile?: string | null;
  } | null;
  evidence?: {
    repetition_ratio_0_1?: number | null;
    unique_section_count?: number | null;
    transition_strength_0_1?: number | null;
    novelty_change_strength_0_1?: number | null;
    section_similarity_mean_0_1?: number | null;
    drop_to_drop_similarity_mean_0_1?: number | null;
  } | null;
};

type WordingPayloadBlock = {
  headline_key?: string | null;
  body_focus_key?: string | null;
  caution_mode?: string | null;
  declared_main_genre?: string | null;
  declared_subgenre?: string | null;
};

type WordingGuardrailsBlock = {
  preferred_phrases?: string[] | null;
};

function formatDecisionLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDeclaredGenreLabel(wordingPayload: WordingPayloadBlock | null) {
  const subgenre = wordingPayload?.declared_subgenre?.trim();
  if (subgenre) return subgenre;

  const mainGenre = wordingPayload?.declared_main_genre?.trim();
  if (mainGenre) return mainGenre;

  return null;
}

function buildShortExplanation(params: {
  decisionSummary: DecisionSummaryBlock | null;
  wordingPayload: WordingPayloadBlock | null;
  wordingGuardrails: WordingGuardrailsBlock | null;
}) {
  const { decisionSummary, wordingPayload, wordingGuardrails } = params;

  if (!decisionSummary || !wordingPayload) {
    return null;
  }

  const preferredPhrases = wordingGuardrails?.preferred_phrases ?? [];
  const leadPhrase = preferredPhrases.includes("this indicates")
    ? "This indicates"
    : "This suggests";

  const genreLabel = getDeclaredGenreLabel(wordingPayload);
  const genreFragment = genreLabel
    ? `for the declared genre (${genreLabel})`
    : "for the declared genre";

  let headline = "Structure needs review";
  switch (wordingPayload.headline_key) {
    case "balanced_structure":
      headline = "Structure feels relatively balanced";
      break;
    case "repetition_warning":
      headline = "Structure may be leaning too repetitive";
      break;
    case "structure_growth_needed":
      headline = "Structure may need stronger development";
      break;
    case "manual_review_needed":
      headline = "Structure should be reviewed more carefully";
      break;
  }

  let body = `${leadPhrase} the current structural direction is worth a cautious reading ${genreFragment}.`;

  switch (wordingPayload.body_focus_key) {
    case "highlight_strengths":
      body = `${leadPhrase} the track already holds together relatively well ${genreFragment}. The best next step is to preserve the structure and refine details without losing the current strengths.`;
      break;
    case "increase_variation":
      body = `${leadPhrase} the arrangement may rely on repeated ideas a bit too heavily ${genreFragment}. A useful next step would be adding more contrast between sections or stronger variation across repeated parts.`;
      break;
    case "strengthen_structure_changes":
      body = `${leadPhrase} the track may benefit from clearer structural growth ${genreFragment}. A useful next step would be strengthening major transitions or adding more distinct development between sections.`;
      break;
    case "explain_uncertainty":
      body = `${leadPhrase} the available signals are mixed ${genreFragment}. This should be treated as a cautious guide, and a manual musical review is still important before making hard conclusions.`;
      break;
  }

  if (wordingPayload.caution_mode === "high") {
    body += " The confidence is limited, so this should not be treated as a hard judgment.";
  } else if (wordingPayload.caution_mode === "medium") {
    body += " This should be read as guidance rather than as a fixed rule.";
  }

  return { headline, body };
}

function formatEvidenceValue(
  value: number | null | undefined,
  digits = 2
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(digits);
}

type DecisionTechnicalDetailsProps = {
  selectedTrack: {
    source_queue_id: string | null;
    genre: string | null;
  } | null;
  feedbackState: Awaited<ReturnType<typeof readFeedbackState>> | null;
};

export function DecisionTechnicalDetails({
  selectedTrack,
  feedbackState,
}: DecisionTechnicalDetailsProps) {
  const feedbackPayload =
    feedbackState && "payload" in feedbackState ? feedbackState.payload : null;

  const decisionSummary =
    feedbackState && feedbackState.ok && feedbackState.feedback_state === "unlocked_ready"
      ? ((feedbackState.payload?.metrics?.structure?.decision_summary ?? null) as DecisionSummaryBlock | null)
      : null;

  const wordingPayload =
    feedbackState && feedbackState.ok && feedbackState.feedback_state === "unlocked_ready"
      ? ((feedbackState.payload?.metrics?.structure?.wording_payload ?? null) as WordingPayloadBlock | null)
      : null;

  const wordingGuardrails =
    feedbackState && feedbackState.ok && feedbackState.feedback_state === "unlocked_ready"
      ? ((feedbackState.payload?.metrics?.structure?.wording_guardrails ?? null) as WordingGuardrailsBlock | null)
      : null;

  const shortExplanation = buildShortExplanation({
    decisionSummary,
    wordingPayload,
    wordingGuardrails,
  });

  const decisionEvidence = decisionSummary?.evidence ?? null;

  const decisionRuleContext =
    feedbackState && feedbackState.ok && feedbackState.feedback_state === "unlocked_ready"
      ? ((feedbackState.payload?.metrics?.structure?.decision_rule_context ?? null) as DecisionRuleContextBlock | null)
      : null;

  const decisionTrace =
    feedbackState && feedbackState.ok && feedbackState.feedback_state === "unlocked_ready"
      ? ((feedbackState.payload?.metrics?.structure?.decision_trace ?? null) as DecisionTraceBlock | null)
      : null;

  const consultantPayload =
    feedbackState && feedbackState.ok && feedbackState.feedback_state === "unlocked_ready"
      ? ((feedbackState.payload?.metrics?.structure?.consultant_payload ?? null) as ConsultantPayloadBlock | null)
      : null;

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
        <div className="text-sm font-medium text-white/85">
          Decision
        </div>

        {!selectedTrack?.source_queue_id ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            This track has no linked analysis queue yet. The decision block cannot be loaded.
          </p>
        ) : !feedbackState ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            No feedback state available.
          </p>
        ) : !feedbackState.ok ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The decision state could not be loaded for this track.
          </p>
        ) : feedbackState.feedback_state === "locked" ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            Feedback is still locked for this track. No decision payload is available yet.
          </p>
        ) : feedbackState.feedback_state === "unlocked_pending" ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            Feedback is unlocked, but the payload is not ready yet.
          </p>
        ) : !decisionSummary ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            A payload exists, but no decision summary was found in the structure block.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-white/55">
              <span className="rounded-full border border-[#00FFC6]/25 bg-[#00FFC6]/10 px-3 py-1 text-[#B8FFF0]">
                Status: {formatDecisionLabel(decisionSummary.status)}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Confidence: {formatDecisionLabel(decisionSummary.confidence_level)}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Selection mode: {formatDecisionLabel(decisionSummary.selection_mode)}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Main reason
                </div>
                <div className="mt-2 text-sm leading-6 text-white/88">
                  {formatDecisionLabel(decisionSummary.main_reason)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Next action
                </div>
                <div className="mt-2 text-sm leading-6 text-white/88">
                  {formatDecisionLabel(decisionSummary.next_action)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Supporting conditions
                </div>

                {decisionSummary.supporting_conditions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {decisionSummary.supporting_conditions.map((condition) => (
                      <span
                        key={condition}
                        className="rounded-full border border-[#00FFC6]/20 bg-[#00FFC6]/8 px-3 py-1 text-xs text-[#B8FFF0]"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/60">No supporting conditions exposed yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Open counterarguments
                </div>

                {decisionSummary.open_counterarguments?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {decisionSummary.open_counterarguments.map((condition) => (
                      <span
                        key={condition}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/78"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/60">No open counterarguments exposed yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
        <div className="text-sm font-medium text-white/85">
          AI decision consultant
        </div>

        {!selectedTrack?.source_queue_id ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            This track has no linked analysis queue yet. No AI consultant can be shown.
          </p>
        ) : !feedbackState ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            No feedback state available.
          </p>
        ) : !feedbackState.ok ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The AI consultant state could not be loaded for this track.
          </p>
        ) : feedbackState.feedback_state !== "unlocked_ready" ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The AI consultant becomes available once the unlocked payload is ready.
          </p>
        ) : (
          <div className="mt-4">
            <AiConsultantCard
              title="AI Decision Consultant"
              description="Choose your target and language, then click &quot;Explain this decision&quot; to get a genre-relative interpretation of the current decision evidence."
              buttonLabel="Explain this decision"
              initialGenre={selectedTrack?.genre ?? null}
              source="decision-center"
              showGenreSelect={false}
              lufs={feedbackState.payload?.metrics?.loudness?.lufs_i ?? null}
              tp={feedbackState.payload?.metrics?.loudness?.true_peak_dbtp_max ?? null}
              lra={feedbackState.payload?.metrics?.dynamics?.loudness_range_lu ?? null}
              crest={feedbackState.payload?.metrics?.dynamics?.crest_factor_db ?? null}
              phase={feedbackState.payload?.metrics?.stereo?.phase_correlation ?? null}
              lowMono={feedbackState.payload?.metrics?.low_end?.phase_correlation_20_120 ?? null}
              width={feedbackState.payload?.metrics?.stereo?.stereo_width_index ?? null}
              midRms={feedbackState.payload?.metrics?.stereo?.mid_rms_dbfs ?? null}
              sideRms={feedbackState.payload?.metrics?.stereo?.side_rms_dbfs ?? null}
              attack={feedbackState.payload?.metrics?.transients?.attack_strength_0_100 ?? null}
              density={feedbackState.payload?.metrics?.transients?.transient_density ?? null}
              sub={feedbackState.payload?.metrics?.spectral?.sub_rms_dbfs ?? null}
              mid={feedbackState.payload?.metrics?.spectral?.mid_rms_dbfs ?? null}
              air={feedbackState.payload?.metrics?.spectral?.air_rms_dbfs ?? null}
              consultantPayload={(feedbackState.payload?.metrics?.structure as any)?.consultant_payload ?? null}
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
        <div className="text-sm font-medium text-white/85">
          Evidence
        </div>

        {!selectedTrack?.source_queue_id ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            This track has no linked analysis queue yet. No evidence block can be shown.
          </p>
        ) : !feedbackState ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            No feedback state available.
          </p>
        ) : !feedbackState.ok ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The evidence state could not be loaded for this track.
          </p>
        ) : feedbackState.feedback_state !== "unlocked_ready" ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The evidence block becomes available once the unlocked payload is ready.
          </p>
        ) : !decisionEvidence ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            A payload exists, but no evidence block was found in the decision summary yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Repetition ratio
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatEvidenceValue(decisionEvidence.repetition_ratio_0_1)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Unique sections
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatEvidenceValue(decisionEvidence.unique_section_count, 0)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Transition strength
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatEvidenceValue(decisionEvidence.transition_strength_0_1)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Novelty change strength
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatEvidenceValue(decisionEvidence.novelty_change_strength_0_1)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Section similarity
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatEvidenceValue(decisionEvidence.section_similarity_mean_0_1)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Drop-to-drop similarity
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatEvidenceValue(decisionEvidence.drop_to_drop_similarity_mean_0_1)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
        <div className="text-sm font-medium text-white/85">
          Rule profile
        </div>

        {!selectedTrack?.source_queue_id ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            This track has no linked analysis queue yet. No rule profile can be shown.
          </p>
        ) : !feedbackState ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            No feedback state available.
          </p>
        ) : !feedbackState.ok ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The rule profile could not be loaded for this track.
          </p>
        ) : feedbackState.feedback_state !== "unlocked_ready" ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The rule profile becomes available once the unlocked payload is ready.
          </p>
        ) : !decisionRuleContext ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            A payload exists, but no decision rule context was found yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-white/55">
              <span className="rounded-full border border-[#00FFC6]/25 bg-[#00FFC6]/10 px-3 py-1 text-[#B8FFF0]">
                Active genre profile: {formatDecisionLabel(decisionRuleContext.active_genre_profile)}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Repetitive thresholds
                </div>
                <div className="mt-3 space-y-2 text-sm text-white/82">
                  <div>
                    repetition min:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.repetitive_thresholds?.repetition_min
                    )}
                  </div>
                  <div>
                    novelty max:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.repetitive_thresholds?.novelty_max
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Balanced thresholds
                </div>
                <div className="mt-3 space-y-2 text-sm text-white/82">
                  <div>
                    repetition max:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.balanced_thresholds?.repetition_max
                    )}
                  </div>
                  <div>
                    novelty min:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.balanced_thresholds?.novelty_min
                    )}
                  </div>
                  <div>
                    transition min:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.balanced_thresholds?.transition_min
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Underdeveloped thresholds
                </div>
                <div className="mt-3 space-y-2 text-sm text-white/82">
                  <div>
                    unique section count max:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.underdeveloped_thresholds?.unique_section_count_max,
                      0
                    )}
                  </div>
                  <div>
                    transition max:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.underdeveloped_thresholds?.transition_max
                    )}
                  </div>
                  <div>
                    novelty max:{" "}
                    {formatEvidenceValue(
                      decisionRuleContext.underdeveloped_thresholds?.novelty_max
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Similarity thresholds
                </div>
                <div className="mt-3 space-y-3 text-sm text-white/82">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                      Repetitive
                    </div>
                    <div className="mt-1">
                      section similarity min:{" "}
                      {formatEvidenceValue(
                        decisionRuleContext.similarity_thresholds?.repetitive?.section_similarity_mean_min
                      )}
                    </div>
                    <div>
                      drop-to-drop similarity min:{" "}
                      {formatEvidenceValue(
                        decisionRuleContext.similarity_thresholds?.repetitive?.drop_to_drop_similarity_mean_min
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                      Balanced
                    </div>
                    <div className="mt-1">
                      section similarity max:{" "}
                      {formatEvidenceValue(
                        decisionRuleContext.similarity_thresholds?.balanced?.section_similarity_mean_max
                      )}
                    </div>
                    <div>
                      drop-to-drop similarity max:{" "}
                      {formatEvidenceValue(
                        decisionRuleContext.similarity_thresholds?.balanced?.drop_to_drop_similarity_mean_max
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
        <div className="text-sm font-medium text-white/85">
          Decision trace
        </div>

        {!selectedTrack?.source_queue_id ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            This track has no linked analysis queue yet. No decision trace can be shown.
          </p>
        ) : !feedbackState ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            No feedback state available.
          </p>
        ) : !feedbackState.ok ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The decision trace could not be loaded for this track.
          </p>
        ) : feedbackState.feedback_state !== "unlocked_ready" ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The decision trace becomes available once the unlocked payload is ready.
          </p>
        ) : !decisionTrace ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            A payload exists, but no decision trace was found yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Matched rule branch
                </div>
                <div className="mt-2 text-sm leading-6 text-white/88">
                  {formatDecisionLabel(decisionTrace.matched_rule_branch)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Selected branch reason
                </div>
                <div className="mt-2 text-sm leading-6 text-white/88">
                  {formatDecisionLabel(decisionTrace.selected_branch_reason)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Threshold profile source
                </div>
                <div className="mt-2 text-sm leading-6 text-white/88">
                  {formatDecisionLabel(decisionTrace.threshold_profile_source)}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Supporting branch conditions
                </div>

                {decisionTrace.selected_branch_passed_conditions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {decisionTrace.selected_branch_passed_conditions.map((condition) => (
                      <span
                        key={condition}
                        className="rounded-full border border-[#00FFC6]/25 bg-[#00FFC6]/10 px-3 py-1 text-xs text-[#B8FFF0]"
                      >
                        {formatDecisionLabel(condition)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    No supporting conditions available.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Open counterarguments
                </div>

                {decisionTrace.selected_branch_failed_conditions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {decisionTrace.selected_branch_failed_conditions.map((condition) => (
                      <span
                        key={condition}
                        className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-white/72"
                      >
                        {formatDecisionLabel(condition)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    No open counterarguments available.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5">
        <div className="text-sm font-medium text-white/85">
          AI review input
        </div>

        {!selectedTrack?.source_queue_id ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            This track has no linked analysis queue yet. No AI review input can be shown.
          </p>
        ) : !feedbackState ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            No feedback state available.
          </p>
        ) : !feedbackState.ok ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The AI review input could not be loaded for this track.
          </p>
        ) : feedbackState.feedback_state !== "unlocked_ready" ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            The AI review input becomes available once the unlocked payload is ready.
          </p>
        ) : !consultantPayload ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            A payload exists, but no consultant payload was found yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-white/55">
              <span className="rounded-full border border-[#00FFC6]/25 bg-[#00FFC6]/10 px-3 py-1 text-[#B8FFF0]">
                Active genre profile: {formatDecisionLabel(consultantPayload.genre_context?.active_genre_profile)}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Caution mode: {formatDecisionLabel(consultantPayload.wording?.caution_mode)}
              </span>
            </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Consultant decision
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/82">
                <div>
                  status: {formatDecisionLabel(consultantPayload.decision?.status)}
                </div>
                <div>
                  main reason: {formatDecisionLabel(consultantPayload.decision?.main_reason)}
                </div>
                <div>
                  next action: {formatDecisionLabel(consultantPayload.decision?.next_action)}
                </div>
                <div>
                  confidence: {formatDecisionLabel(consultantPayload.decision?.confidence_level)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Genre context
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/82">
                <div>
                  main genre: {consultantPayload.genre_context?.declared_main_genre?.trim() || "—"}
                </div>
                <div>
                  subgenre: {consultantPayload.genre_context?.declared_subgenre?.trim() || "—"}
                </div>
                <div>
                  reference artist: {consultantPayload.genre_context?.declared_reference_artist?.trim() || "—"}
                </div>
                <div>
                  reference track: {consultantPayload.genre_context?.declared_reference_track?.trim() || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Consultant evidence
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/82">
                <div>
                  repetition ratio: {formatEvidenceValue(consultantPayload.evidence?.repetition_ratio_0_1)}
                </div>
                <div>
                  unique sections: {formatEvidenceValue(consultantPayload.evidence?.unique_section_count, 0)}
                </div>
                <div>
                  transition strength: {formatEvidenceValue(consultantPayload.evidence?.transition_strength_0_1)}
                </div>
                <div>
                  novelty change strength: {formatEvidenceValue(consultantPayload.evidence?.novelty_change_strength_0_1)}
                </div>
                <div>
                  section similarity: {formatEvidenceValue(consultantPayload.evidence?.section_similarity_mean_0_1)}
                </div>
                <div>
                  drop-to-drop similarity: {formatEvidenceValue(consultantPayload.evidence?.drop_to_drop_similarity_mean_0_1)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                Guardrails
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/82">
                <div>
                  avoid absolute judgment: {consultantPayload.guardrails?.avoid_absolute_judgment ? "Yes" : "No"}
                </div>
                <div>
                  evidence-based language: {consultantPayload.guardrails?.require_evidence_based_language ? "Yes" : "No"}
                </div>
                <div>
                  genre-relative language: {consultantPayload.guardrails?.require_genre_relative_language ? "Yes" : "No"}
                </div>
                <div>
                  preserve artistic intent space: {consultantPayload.guardrails?.preserve_artistic_intent_space ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Preferred phrases
                </div>
                {consultantPayload.guardrails?.preferred_phrases?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {consultantPayload.guardrails.preferred_phrases.map((phrase) => (
                      <span
                        key={phrase}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/78"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/60">—</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Forbidden phrases
                </div>
                {consultantPayload.guardrails?.forbidden_phrases?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {consultantPayload.guardrails.forbidden_phrases.map((phrase) => (
                      <span
                        key={phrase}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/78"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/60">—</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
