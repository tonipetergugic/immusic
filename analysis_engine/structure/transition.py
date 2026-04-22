from __future__ import annotations

from typing import Any


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
    Compute a first simple transition-strength score.

    Interpretation:
    - higher score => stronger / clearer selected transitions
    - lower score => weaker / softer selected transitions

    The score is based on the final selected boundary candidates.
    """
    decisions = macro_sections_payload.get("macro_boundary_decisions") or []

    if not decisions:
        return None

    decision_scores: list[float] = []

    for decision in decisions:
        candidate = _find_final_candidate(decision)
        if not candidate:
            continue

        boundary_score = _safe_float(candidate.get("boundary_score"))
        delta_norm = _safe_float(candidate.get("delta_norm"))
        similarity_prev_to_here = _safe_float(candidate.get("similarity_prev_to_here"))

        parts: list[float] = []

        if boundary_score is not None:
            parts.append(boundary_score)

        if delta_norm is not None:
            parts.append(delta_norm)

        if similarity_prev_to_here is not None:
            parts.append(1.0 - similarity_prev_to_here)

        if not parts:
            continue

        decision_scores.append(sum(parts) / len(parts))

    if not decision_scores:
        return None

    return float(sum(decision_scores) / len(decision_scores))
