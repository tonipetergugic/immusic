from __future__ import annotations

from typing import Any, Mapping


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _clamp_01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def compute_composite_transition_score(candidate: Mapping[str, Any]) -> float:
    peak_strength = _safe_float(candidate.get("peak_strength"))
    peak_dominance = _safe_float(candidate.get("peak_dominance"))
    local_contrast = _safe_float(candidate.get("local_contrast"))
    state_change_strength = _safe_float(candidate.get("state_change_strength"))
    persistence_after_change = _safe_float(candidate.get("persistence_after_change"))

    profile = candidate.get("transition_window_profile")
    if isinstance(profile, Mapping):
        window_peak_strength_max = _safe_float(profile.get("peak_strength_max"))
        window_local_contrast_max = _safe_float(profile.get("local_contrast_max"))
        window_state_change_strength_max = _safe_float(profile.get("state_change_strength_max"))
        window_persistence_after_change_max = _safe_float(profile.get("persistence_after_change_max"))
        candidate_count = _safe_float(profile.get("candidate_count"))
    else:
        window_peak_strength_max = 0.0
        window_local_contrast_max = 0.0
        window_state_change_strength_max = 0.0
        window_persistence_after_change_max = 0.0
        candidate_count = 0.0

    window_support = (
        0.35 * window_peak_strength_max
        + 0.20 * window_local_contrast_max
        + 0.25 * window_state_change_strength_max
        + 0.20 * window_persistence_after_change_max
    ) * min(1.0, candidate_count / 3.0)

    score = (
        0.22 * peak_strength
        + 0.10 * peak_dominance
        + 0.18 * local_contrast
        + 0.22 * state_change_strength
        + 0.18 * persistence_after_change
        + 0.10 * window_support
    )

    return _clamp_01(score)
