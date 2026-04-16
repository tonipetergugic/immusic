from __future__ import annotations

import numpy as np

from schemas import Bar, TransitionMetrics, TransitionPoint


MAJOR_PERCENTILE = 85.0
CLUSTER_BAR_DISTANCE = 2
PRE_REGION_BARS = 4
POST_REGION_BARS = 4
INTRO_EXCLUSION_BARS = 8
OUTRO_EXCLUSION_BARS = 8


def compute_transitions(
    bars: list[Bar],
    smoothed_curve: list[float],
) -> TransitionMetrics:
    if not _has_valid_inputs(bars, smoothed_curve):
        return _empty_transitions()

    transition_strengths = _compute_transition_strengths(smoothed_curve)
    candidate_indices = _find_major_candidate_indices(transition_strengths)

    if not candidate_indices:
        return TransitionMetrics(
            global_score=0.0,
            transition_label="very_flat",
            major_transition_points=[],
            transition_strengths=transition_strengths,
            strongest_transition=None,
        )

    bundled_indices = _bundle_candidate_indices(
        candidate_indices=candidate_indices,
        transition_strengths=transition_strengths,
    )

    if not bundled_indices:
        return TransitionMetrics(
            global_score=0.0,
            transition_label="very_flat",
            major_transition_points=[],
            transition_strengths=transition_strengths,
            strongest_transition=None,
        )

    major_transition_points: list[TransitionPoint] = []
    for bar_index in bundled_indices:
        if bar_index < INTRO_EXCLUSION_BARS:
            continue
        if bar_index > len(bars) - 1 - OUTRO_EXCLUSION_BARS:
            continue
        major_transition_points.append(
            _build_transition_point(
                bars=bars,
                bar_index=bar_index,
                strength=transition_strengths[bar_index],
            )
        )

    if not major_transition_points:
        return TransitionMetrics(
            global_score=0.0,
            transition_label="very_flat",
            major_transition_points=[],
            transition_strengths=transition_strengths,
            strongest_transition=None,
        )

    major_strengths = [point.strength for point in major_transition_points]
    mean_major_strength = float(np.mean(major_strengths)) if major_strengths else 0.0
    strongest_transition = max(major_transition_points, key=lambda point: point.strength)
    strongest_transition_strength = float(strongest_transition.strength)
    transition_count_ratio = float(np.clip(len(major_transition_points) / 6.0, 0.0, 1.0))

    global_score = (
        0.5 * mean_major_strength
        + 0.3 * strongest_transition_strength
        + 0.2 * transition_count_ratio
    )
    global_score = float(np.clip(global_score, 0.0, 1.0))
    transition_label = _transition_label_from_score(global_score)

    return TransitionMetrics(
        global_score=global_score,
        transition_label=transition_label,
        major_transition_points=major_transition_points,
        transition_strengths=transition_strengths,
        strongest_transition=strongest_transition,
    )


def _empty_transitions() -> TransitionMetrics:
    return TransitionMetrics(
        global_score=0.0,
        transition_label="very_flat",
        major_transition_points=[],
        transition_strengths=[],
        strongest_transition=None,
    )


def _has_valid_inputs(bars: list[Bar], smoothed_curve: list[float]) -> bool:
    if not bars or not smoothed_curve:
        return False
    if len(bars) != len(smoothed_curve):
        return False
    if len(bars) < 2:
        return False
    return True


def _compute_transition_strengths(smoothed_curve: list[float]) -> list[float]:
    curve = np.asarray(smoothed_curve, dtype=np.float64)
    strengths = np.zeros(curve.shape[0], dtype=np.float64)

    for index in range(1, curve.shape[0]):
        raw_strength = abs(float(curve[index]) - float(curve[index - 1]))
        strengths[index] = float(np.clip(raw_strength, 0.0, 1.0))

    return [float(value) for value in strengths.tolist()]


def _find_major_candidate_indices(transition_strengths: list[float]) -> list[int]:
    if len(transition_strengths) < 2:
        return []

    strengths = np.asarray(transition_strengths[1:], dtype=np.float64)
    positive_strengths = strengths[strengths > 0]

    if positive_strengths.size == 0:
        return []

    threshold = float(np.percentile(positive_strengths, MAJOR_PERCENTILE))
    candidate_indices: list[int] = []

    for bar_index in range(1, len(transition_strengths)):
        strength = float(transition_strengths[bar_index])
        if strength >= threshold and strength > 0.0:
            candidate_indices.append(bar_index)

    return candidate_indices


def _bundle_candidate_indices(
    candidate_indices: list[int],
    transition_strengths: list[float],
) -> list[int]:
    if not candidate_indices:
        return []

    bundled: list[int] = []
    current_cluster: list[int] = [candidate_indices[0]]

    for index in candidate_indices[1:]:
        if index - current_cluster[-1] <= CLUSTER_BAR_DISTANCE:
            current_cluster.append(index)
            continue

        bundled.append(_strongest_index_in_cluster(current_cluster, transition_strengths))
        current_cluster = [index]

    bundled.append(_strongest_index_in_cluster(current_cluster, transition_strengths))
    return bundled


def _strongest_index_in_cluster(
    cluster_indices: list[int],
    transition_strengths: list[float],
) -> int:
    return max(cluster_indices, key=lambda index: transition_strengths[index])


def _build_transition_point(
    bars: list[Bar],
    bar_index: int,
    strength: float,
) -> TransitionPoint:
    last_bar_index = len(bars) - 1

    pre_region_start_bar = max(0, bar_index - PRE_REGION_BARS)
    pre_region_end_bar = max(0, bar_index - 1)
    post_region_start_bar = bar_index
    post_region_end_bar = min(last_bar_index, bar_index + POST_REGION_BARS - 1)

    return TransitionPoint(
        bar_index=bar_index,
        time_sec=float(bars[bar_index].start),
        strength=float(np.clip(strength, 0.0, 1.0)),
        pre_region_start_bar=pre_region_start_bar,
        pre_region_end_bar=pre_region_end_bar,
        post_region_start_bar=post_region_start_bar,
        post_region_end_bar=post_region_end_bar,
    )


def _transition_label_from_score(global_score: float) -> str:
    score = float(np.clip(global_score, 0.0, 1.0))

    if score < 0.20:
        return "very_flat"
    if score < 0.40:
        return "gentle"
    if score < 0.60:
        return "balanced"
    if score < 0.80:
        return "contrasty"
    return "very_contrasty"
