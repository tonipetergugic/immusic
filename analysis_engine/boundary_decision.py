from __future__ import annotations

from typing import Any


DUPLICATE_GAP_BARS = 9
DELTA_NORM_DIVISOR = 1.5
MIN_SCORE_GAP_FOR_SUPPRESSION = 0.25
MAX_NON_DUPLICATE_STRENGTH_FOR_DUPLICATE = 0.60
MAX_DELTA_NORM_FOR_DUPLICATE = 0.60


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _normalize_candidate(
    candidate: dict[str, Any],
    bars: list[dict[str, float | int]],
) -> dict[str, Any] | None:
    raw_index = candidate.get("bar_index")
    if raw_index is None:
        return None

    try:
        bar_index = int(raw_index)
    except (TypeError, ValueError):
        return None

    if bar_index <= 0:
        return None

    if bar_index >= len(bars):
        return None

    novelty = _clamp(_to_float(candidate.get("score")))
    delta_from_prev = max(0.0, _to_float(candidate.get("delta_from_prev")))
    similarity_prev_to_here = _clamp(_to_float(candidate.get("similarity_prev_to_here")))
    forward_stability = _clamp(_to_float(candidate.get("forward_stability")))

    delta_norm = _clamp(delta_from_prev / DELTA_NORM_DIVISOR)
    change_strength = 0.5 * novelty + 0.5 * delta_norm
    non_duplicate_strength = 1.0 - similarity_prev_to_here

    boundary_score = (
        0.45 * change_strength
        + 0.35 * forward_stability
        + 0.20 * non_duplicate_strength
    )

    normalized = dict(candidate)
    normalized["bar_index"] = bar_index
    normalized["start_sec"] = float(bars[bar_index]["start"])
    normalized["score"] = novelty
    normalized["delta_from_prev"] = delta_from_prev
    normalized["similarity_prev_to_here"] = similarity_prev_to_here
    normalized["forward_stability"] = forward_stability
    normalized["delta_norm"] = delta_norm
    normalized["change_strength"] = change_strength
    normalized["non_duplicate_strength"] = non_duplicate_strength
    normalized["boundary_score"] = boundary_score
    return normalized


def analyze_boundary_decision(
    boundary_candidates: list[dict[str, Any]],
    bars: list[dict[str, float | int]],
) -> dict[str, Any]:
    if not boundary_candidates or not bars:
        return {
            "method": "scored_pair_boundary_decision",
            "decision_mode": "scored_pair_suppression",
            "input_candidate_count": len(boundary_candidates),
            "scored_candidate_count": 0,
            "compared_pair_count": 0,
            "kept_boundary_bar_indices": [],
            "removed_boundary_bar_indices": [],
            "final_boundary_count": 0,
            "final_boundaries": [],
            "pair_evaluations": [],
            "is_empty": True,
        }

    normalized_candidates: list[dict[str, Any]] = []
    seen_indices: set[int] = set()

    for candidate in boundary_candidates:
        normalized = _normalize_candidate(candidate, bars)
        if normalized is None:
            continue

        bar_index = int(normalized["bar_index"])
        if bar_index in seen_indices:
            continue

        seen_indices.add(bar_index)
        normalized_candidates.append(normalized)

    normalized_candidates.sort(key=lambda item: int(item["bar_index"]))

    if not normalized_candidates:
        return {
            "method": "scored_pair_boundary_decision",
            "decision_mode": "scored_pair_suppression",
            "input_candidate_count": len(boundary_candidates),
            "scored_candidate_count": 0,
            "compared_pair_count": 0,
            "kept_boundary_bar_indices": [],
            "removed_boundary_bar_indices": [],
            "final_boundary_count": 0,
            "final_boundaries": [],
            "pair_evaluations": [],
            "is_empty": True,
        }

    final_boundaries: list[dict[str, Any]] = []
    removed_bar_indices: list[int] = []
    pair_evaluations: list[dict[str, Any]] = []

    index = 0
    while index < len(normalized_candidates):
        current = normalized_candidates[index]
        current_bar_index = int(current["bar_index"])

        current_boundary = dict(current)
        current_boundary["decision"] = "keep"
        current_boundary["decision_source"] = "scored_pair_boundary_decision"
        current_boundary["decision_reason"] = "kept_after_pair_scan"

        suppress_next = False

        if index + 1 < len(normalized_candidates):
            later = normalized_candidates[index + 1]
            later_bar_index = int(later["bar_index"])
            gap_bars = later_bar_index - current_bar_index

            if gap_bars <= DUPLICATE_GAP_BARS:
                score_gap = float(current["boundary_score"]) - float(later["boundary_score"])
                later_is_duplicate_like = (
                    float(later["non_duplicate_strength"]) <= MAX_NON_DUPLICATE_STRENGTH_FOR_DUPLICATE
                    and float(later["delta_norm"]) <= MAX_DELTA_NORM_FOR_DUPLICATE
                )
                remove_later = (
                    later_is_duplicate_like
                    and score_gap >= MIN_SCORE_GAP_FOR_SUPPRESSION
                )

                pair_evaluations.append(
                    {
                        "earlier_bar_index": current_bar_index,
                        "later_bar_index": later_bar_index,
                        "gap_bars": gap_bars,
                        "earlier_boundary_score": float(current["boundary_score"]),
                        "later_boundary_score": float(later["boundary_score"]),
                        "score_gap": score_gap,
                        "later_non_duplicate_strength": float(later["non_duplicate_strength"]),
                        "later_delta_norm": float(later["delta_norm"]),
                        "later_similarity_prev_to_here": float(later["similarity_prev_to_here"]),
                        "later_is_duplicate_like": later_is_duplicate_like,
                        "action": "remove_later" if remove_later else "keep_both",
                    }
                )

                if remove_later:
                    suppress_next = True
                    removed_bar_indices.append(later_bar_index)
                    current_boundary["decision_reason"] = "kept_stronger_than_duplicate_like_later_candidate"

        final_boundaries.append(current_boundary)

        if suppress_next:
            index += 2
        else:
            index += 1

    final_boundaries.sort(key=lambda item: int(item["bar_index"]))
    kept_bar_indices = [int(item["bar_index"]) for item in final_boundaries]
    removed_bar_indices = sorted(set(removed_bar_indices))

    return {
        "method": "scored_pair_boundary_decision",
        "decision_mode": "scored_pair_suppression",
        "input_candidate_count": len(boundary_candidates),
        "scored_candidate_count": len(normalized_candidates),
        "compared_pair_count": len(pair_evaluations),
        "kept_boundary_bar_indices": kept_bar_indices,
        "removed_boundary_bar_indices": removed_bar_indices,
        "final_boundary_count": len(final_boundaries),
        "final_boundaries": final_boundaries,
        "pair_evaluations": pair_evaluations,
        "is_empty": len(final_boundaries) == 0,
    }
