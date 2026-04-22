from __future__ import annotations

from typing import Any


def _clamp_01(value: Any) -> float | None:
    if value is None:
        return None

    numeric = float(value)

    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0

    return numeric


def _harmonic_mean(values: list[float | None]) -> float | None:
    cleaned = [value for value in values if value is not None]

    if not cleaned:
        return None

    if len(cleaned) == 1:
        return cleaned[0]

    if any(value <= 0.0 for value in cleaned):
        return 0.0

    return len(cleaned) / sum(1.0 / value for value in cleaned)


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _find_final_candidate(decision: dict[str, Any]) -> dict[str, Any] | None:
    final_bar_index = decision.get("final_selected_bar_index")
    selected_bar_index = decision.get("selected_bar_index")

    target_bar_index = final_bar_index if final_bar_index is not None else selected_bar_index
    if target_bar_index is None:
        return None

    candidates = decision.get("candidates") or []
    for candidate in candidates:
        if candidate.get("bar_index") == target_bar_index:
            return candidate

    return None


def compute_transition_score(macro_sections_payload: dict[str, Any]) -> float | None:
    """
    Compute a stricter artist-facing transition score from selected macro-boundary decisions.

    Decision rules:
    - Core quality comes from boundary_score and delta_norm
    - The core uses a harmonic mean instead of a friendly arithmetic mean
    - similarity_prev_to_here is only a small capped bonus
    - very weak boundaries are softly downweighted instead of hard-removed
    - few transitions reduce confidence via a count-based multiplier
    """
    macro_boundary_decisions = macro_sections_payload.get("macro_boundary_decisions") or []

    weighted_total = 0.0
    weight_sum = 0.0
    transition_count = 0

    for decision in macro_boundary_decisions:
        candidates = decision.get("candidates") or []

        selected_bar_index = decision.get("final_selected_bar_index")
        if selected_bar_index is None:
            selected_bar_index = decision.get("selected_bar_index")

        if selected_bar_index is None:
            continue

        selected_candidate = next(
            (
                candidate
                for candidate in candidates
                if candidate.get("bar_index") == selected_bar_index
            ),
            None,
        )

        if not isinstance(selected_candidate, dict):
            continue

        boundary_score = _clamp_01(selected_candidate.get("boundary_score"))
        delta_norm = _clamp_01(selected_candidate.get("delta_norm"))
        similarity_prev_to_here = _clamp_01(
            selected_candidate.get("similarity_prev_to_here")
        )

        core_quality = _harmonic_mean([boundary_score, delta_norm])
        if core_quality is None:
            continue

        similarity_bonus = 0.0
        if similarity_prev_to_here is not None:
            similarity_bonus = 0.10 * (1.0 - similarity_prev_to_here)

        transition_quality = min(1.0, core_quality + similarity_bonus)

        quality_weight = 1.0
        if boundary_score is not None and boundary_score < 0.40:
            quality_weight = 0.5

        weighted_total += transition_quality * quality_weight
        weight_sum += quality_weight
        transition_count += 1

    if transition_count == 0 or weight_sum == 0.0:
        return None

    average_quality = weighted_total / weight_sum
    confidence = 0.5 + 0.5 * min(1.0, transition_count / 3.0)

    return average_quality * confidence
