from __future__ import annotations

from typing import Any, Sequence


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def compute_transition_window_profile(
    candidate_evaluations: Sequence[dict[str, Any]],
    center_bar_index: int,
    radius: int = 1,
) -> dict[str, Any]:
    center_bar_index = int(center_bar_index)
    radius = max(0, int(radius))

    window_items = [
        item
        for item in candidate_evaluations
        if abs(_safe_int(item.get("bar_index"), default=-999999) - center_bar_index) <= radius
    ]

    if not window_items:
        return {
            "center_bar_index": center_bar_index,
            "radius": radius,
            "window_start_bar_index": center_bar_index,
            "window_end_bar_index": center_bar_index,
            "window_span_bars": 0,
            "candidate_count": 0,
            "peak_strength_max": 0.0,
            "peak_strength_mean": 0.0,
            "peak_dominance_max": 0.0,
            "local_contrast_max": 0.0,
            "state_change_strength_max": 0.0,
            "persistence_after_change_max": 0.0,
            "neighborhood_density_mean": 0.0,
        }

    bar_indices = [_safe_int(item.get("bar_index")) for item in window_items]
    peak_strength_values = [_safe_float(item.get("peak_strength")) for item in window_items]
    peak_dominance_values = [_safe_float(item.get("peak_dominance")) for item in window_items]
    local_contrast_values = [_safe_float(item.get("local_contrast")) for item in window_items]
    state_change_values = [_safe_float(item.get("state_change_strength")) for item in window_items]
    persistence_values = [_safe_float(item.get("persistence_after_change")) for item in window_items]
    density_values = [_safe_float(item.get("neighborhood_density")) for item in window_items]

    window_start_bar_index = min(bar_indices)
    window_end_bar_index = max(bar_indices)

    return {
        "center_bar_index": center_bar_index,
        "radius": radius,
        "window_start_bar_index": window_start_bar_index,
        "window_end_bar_index": window_end_bar_index,
        "window_span_bars": max(0, window_end_bar_index - window_start_bar_index + 1),
        "candidate_count": len(window_items),
        "peak_strength_max": max(peak_strength_values) if peak_strength_values else 0.0,
        "peak_strength_mean": (
            sum(peak_strength_values) / len(peak_strength_values)
            if peak_strength_values
            else 0.0
        ),
        "peak_dominance_max": max(peak_dominance_values) if peak_dominance_values else 0.0,
        "local_contrast_max": max(local_contrast_values) if local_contrast_values else 0.0,
        "state_change_strength_max": max(state_change_values) if state_change_values else 0.0,
        "persistence_after_change_max": (
            max(persistence_values) if persistence_values else 0.0
        ),
        "neighborhood_density_mean": (
            sum(density_values) / len(density_values)
            if density_values
            else 0.0
        ),
    }
