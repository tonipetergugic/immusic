from __future__ import annotations

import numpy as np

from schemas import (
    ChangeDistributionMetrics,
    ChangeIntensityMetrics,
    DerivedAssessment,
    MacroMetricsResult,
    RegionSimilarityMetrics,
    StabilityMetrics,
    TransitionMetrics,
)


def compute_macro_metrics(
    change_intensity: ChangeIntensityMetrics | None,
    stability: StabilityMetrics | None,
    transitions: TransitionMetrics | None,
    change_distribution: ChangeDistributionMetrics | None,
    region_similarity: RegionSimilarityMetrics | None,
) -> MacroMetricsResult:
    _validate_inputs(
        change_intensity=change_intensity,
        stability=stability,
        transitions=transitions,
        change_distribution=change_distribution,
        region_similarity=region_similarity,
    )

    change_intensity = change_intensity
    stability = stability
    transitions = transitions
    change_distribution = change_distribution
    region_similarity = region_similarity

    avg_uniqueness = _average_uniqueness(region_similarity)
    transition_count = len(transitions.major_transition_points)
    transition_count_ratio = float(np.clip(transition_count / 8.0, 0.0, 1.0))
    inactive_ratio = _inactive_ratio(change_distribution)

    repetition_score = float(
        np.clip(
            (0.75 * region_similarity.global_score)
            + (0.25 * (1.0 - avg_uniqueness)),
            0.0,
            1.0,
        )
    )

    density_score = float(
        np.clip(
            (0.55 * change_intensity.global_score)
            + (0.25 * transitions.global_score)
            + (0.20 * transition_count_ratio),
            0.0,
            1.0,
        )
    )

    fragmentation_score = float(
        np.clip(
            (0.45 * (1.0 - stability.global_score))
            + (0.35 * transitions.global_score)
            + (0.20 * transition_count_ratio),
            0.0,
            1.0,
        )
    )

    flatness_score = float(
        np.clip(
            (0.35 * (1.0 - change_intensity.global_score))
            + (0.25 * (1.0 - transitions.global_score))
            + (0.25 * region_similarity.global_score)
            + (0.15 * inactive_ratio),
            0.0,
            1.0,
        )
    )

    diversity_balance = _diversity_balance(region_similarity.global_score)
    contrast_score = float(
        np.clip(
            (0.35 * change_intensity.global_score)
            + (0.35 * transitions.global_score)
            + (0.20 * change_distribution.global_score)
            + (0.10 * diversity_balance),
            0.0,
            1.0,
        )
    )

    structural_motion_score = float(
        np.clip(
            (0.45 * density_score)
            + (0.25 * transitions.global_score)
            + (0.20 * change_distribution.global_score)
            + (0.10 * (1.0 - inactive_ratio)),
            0.0,
            1.0,
        )
    )

    repetition_degree = _bucket_score(repetition_score)
    change_density = _bucket_score(density_score)
    development_balance = _development_balance(
        change_distribution=change_distribution,
        density_score=density_score,
        inactive_ratio=inactive_ratio,
    )

    macro_state = _select_macro_state(
        repetition_score=repetition_score,
        density_score=density_score,
        structural_motion_score=structural_motion_score,
        fragmentation_score=fragmentation_score,
        flatness_score=flatness_score,
        contrast_score=contrast_score,
        stability_score=stability.global_score,
        transition_score=transitions.global_score,
        transition_count=transition_count,
        change_intensity_score=change_intensity.global_score,
        region_similarity_score=region_similarity.global_score,
    )

    supporting_reasons = _build_supporting_reasons(
        macro_state=macro_state,
        repetition_score=repetition_score,
        density_score=density_score,
        fragmentation_score=fragmentation_score,
        transition_count=transition_count,
        inactive_ratio=inactive_ratio,
        avg_uniqueness=avg_uniqueness,
        development_balance=development_balance,
    )

    return MacroMetricsResult(
        change_intensity=change_intensity,
        stability=stability,
        transitions=transitions,
        change_distribution=change_distribution,
        region_similarity=region_similarity,
        derived_assessment=DerivedAssessment(
            repetition_degree=repetition_degree,
            change_density=change_density,
            development_balance=development_balance,
            macro_state=macro_state,
            supporting_reasons=supporting_reasons,
        ),
    )


def _validate_inputs(
    *,
    change_intensity: ChangeIntensityMetrics | None,
    stability: StabilityMetrics | None,
    transitions: TransitionMetrics | None,
    change_distribution: ChangeDistributionMetrics | None,
    region_similarity: RegionSimilarityMetrics | None,
) -> None:
    missing: list[str] = []

    if change_intensity is None:
        missing.append("change_intensity")
    if stability is None:
        missing.append("stability")
    if transitions is None:
        missing.append("transitions")
    if change_distribution is None:
        missing.append("change_distribution")
    if region_similarity is None:
        missing.append("region_similarity")

    if missing:
        raise ValueError(f"Missing macro metric inputs: {', '.join(missing)}")


def _average_uniqueness(region_similarity: RegionSimilarityMetrics) -> float:
    if not region_similarity.uniqueness_profile:
        return 0.0

    values = [
        float(entry.uniqueness_score)
        for entry in region_similarity.uniqueness_profile
    ]
    return float(np.clip(np.mean(values), 0.0, 1.0))


def _inactive_ratio(change_distribution: ChangeDistributionMetrics) -> float:
    total_bars = len(change_distribution.timeline_profile)
    if total_bars <= 0:
        return 0.0

    inactive_bars = sum(region.length_bars for region in change_distribution.inactive_regions)
    return float(np.clip(inactive_bars / total_bars, 0.0, 1.0))


def _diversity_balance(region_similarity_score: float) -> float:
    distance_from_mid = abs(float(region_similarity_score) - 0.5)
    normalized_distance = min(distance_from_mid / 0.5, 1.0)
    return float(np.clip(1.0 - normalized_distance, 0.0, 1.0))


def _bucket_score(score: float) -> str:
    value = float(np.clip(score, 0.0, 1.0))

    if value < 0.20:
        return "very_low"
    if value < 0.40:
        return "low"
    if value < 0.60:
        return "balanced"
    if value < 0.80:
        return "high"
    return "very_high"


def _development_balance(
    *,
    change_distribution: ChangeDistributionMetrics,
    density_score: float,
    inactive_ratio: float,
) -> str:
    if density_score < 0.30 and inactive_ratio >= 0.25:
        return "underdeveloped"

    return change_distribution.distribution_label


def _select_macro_state(
    *,
    repetition_score: float,
    density_score: float,
    structural_motion_score: float,
    fragmentation_score: float,
    flatness_score: float,
    contrast_score: float,
    stability_score: float,
    transition_score: float,
    transition_count: int,
    change_intensity_score: float,
    region_similarity_score: float,
) -> str:
    if (
        fragmentation_score >= 0.72
        and stability_score <= 0.45
        and transition_score >= 0.42
    ):
        return "too_fragmented"

    if (
        repetition_score >= 0.82
        and region_similarity_score >= 0.85
        and change_intensity_score <= 0.22
        and stability_score >= 0.65
    ):
        return "too_repetitive"

    if (
        repetition_score >= 0.82
        and structural_motion_score < 0.42
        and transition_count <= 6
        and change_intensity_score <= 0.50
    ):
        return "too_repetitive"

    if (
        flatness_score >= 0.70
        and density_score < 0.45
        and transition_count <= 4
    ):
        return "too_flat"

    if (
        contrast_score >= 0.62
        and change_intensity_score >= 0.45
        and transition_score >= 0.35
        and transition_count >= 4
        and 0.28 <= region_similarity_score <= 0.78
    ):
        return "strong_contrast"

    return "balanced"


def _build_supporting_reasons(
    *,
    macro_state: str,
    repetition_score: float,
    density_score: float,
    fragmentation_score: float,
    transition_count: int,
    inactive_ratio: float,
    avg_uniqueness: float,
    development_balance: str,
) -> list[str]:
    reasons: list[str] = []

    if macro_state == "too_repetitive":
        reasons.append("High region similarity with very low section uniqueness.")
        reasons.append("Structural motion stays too limited to offset the repetition.")
        if transition_count <= 2:
            reasons.append("The track contains very few major transition points.")
    elif macro_state == "too_flat":
        reasons.append("Overall change density is low across the track.")
        reasons.append("Transitions are too weak to create enough structural movement.")
        if transition_count <= 2:
            reasons.append("The track contains very few major transition points.")
    elif macro_state == "too_fragmented":
        reasons.append("Structural stability is too low relative to the amount of change.")
        reasons.append("Too many strong transitions create a fragmented flow.")
        if transition_count >= 6:
            reasons.append("The track contains many major transition points.")
    elif macro_state == "strong_contrast":
        reasons.append("Change density and transitions create clear structural contrast.")
        reasons.append("The track still keeps enough balance to avoid fragmentation.")
        if transition_count >= 5:
            reasons.append("The track contains several major transition points.")
    else:
        reasons.append("The current metric blend points to a broadly balanced macro flow.")
        if avg_uniqueness <= 0.15 and transition_count >= 5:
            reasons.append("Repeated material is balanced by several structural transition points.")
        elif transition_count >= 5:
            reasons.append("The track contains several structural transition points without breaking flow.")
        elif transition_count <= 2:
            reasons.append("The track stays restrained in its number of major transition points.")

    if inactive_ratio >= 0.25:
        reasons.append("A large inactive region weakens the overall development.")

    if avg_uniqueness >= 0.55:
        reasons.append("Sections keep enough uniqueness to avoid over-repetition.")
    elif avg_uniqueness <= 0.15 and macro_state == "too_repetitive":
        reasons.append("Sections stay highly alike across large parts of the track.")

    if development_balance not in {"balanced", "slightly_unbalanced"}:
        reasons.append(f"Development profile is {development_balance.replace('_', ' ')}.")

    deduped: list[str] = []
    seen: set[str] = set()
    for reason in reasons:
        if reason in seen:
            continue
        deduped.append(reason)
        seen.add(reason)

    return deduped[:5]
