from __future__ import annotations

from typing import Any


def _clamp_01(value: float | int | None) -> float:
    if value is None:
        return 0.0
    value = float(value)
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def _normalize_series(values: list[float]) -> list[float]:
    if not values:
        return []

    minimum = min(values)
    maximum = max(values)

    if maximum <= minimum:
        return [0.0 for _ in values]

    return [(value - minimum) / (maximum - minimum) for value in values]


def _pad_or_trim(values: list[float], target_length: int) -> list[float]:
    if target_length <= 0:
        return []

    if len(values) >= target_length:
        return values[:target_length]

    return values + [0.0] * (target_length - len(values))


def _extract_rms_series(features_payload: dict[str, Any]) -> list[float]:
    feature_names = features_payload.get("feature_names") or []
    bar_feature_vectors = features_payload.get("bar_feature_vectors") or []

    if not isinstance(feature_names, list) or not isinstance(bar_feature_vectors, list):
        return []

    try:
        rms_index = feature_names.index("rms_mean")
    except ValueError:
        return []

    rms_values: list[float] = []

    for vector in bar_feature_vectors:
        if not isinstance(vector, list):
            rms_values.append(0.0)
            continue

        if rms_index >= len(vector):
            rms_values.append(0.0)
            continue

        raw_value = vector[rms_index]
        rms_values.append(float(raw_value) if raw_value is not None else 0.0)

    return rms_values


def _extract_novelty_series(novelty_payload: dict[str, Any]) -> list[float]:
    novelty_curve = novelty_payload.get("novelty_curve") or []

    if not isinstance(novelty_curve, list):
        return []

    result: list[float] = []

    for value in novelty_curve:
        result.append(float(value) if value is not None else 0.0)

    return result


def _extract_macro_boundary_bars(macro_sections_payload: dict[str, Any]) -> list[int]:
    macro_sections = macro_sections_payload.get("macro_sections") or []

    if not isinstance(macro_sections, list):
        return []

    boundary_bars: list[int] = []

    for section in macro_sections:
        if not isinstance(section, dict):
            continue

        start_bar_index = section.get("start_bar_index")
        if start_bar_index is None:
            continue

        start_bar_index = int(start_bar_index)

        if start_bar_index <= 0:
            continue

        boundary_bars.append(start_bar_index)

    return sorted(set(boundary_bars))


def _build_macro_context_series(bar_count: int, macro_boundary_bars: list[int]) -> list[float]:
    if bar_count <= 0:
        return []

    if not macro_boundary_bars:
        return [0.0] * bar_count

    context: list[float] = []

    for bar_index in range(bar_count):
        min_distance = min(abs(bar_index - boundary_bar) for boundary_bar in macro_boundary_bars)

        if min_distance == 0:
            strength = 1.0
        elif min_distance == 1:
            strength = 0.6
        elif min_distance == 2:
            strength = 0.3
        else:
            strength = 0.0

        context.append(strength)

    return context


def compute_bar_structure_fusion(
    features_payload: dict[str, Any],
    novelty_payload: dict[str, Any],
    macro_sections_payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Build a minimal bar-level structure fusion signal.

    Purpose:
    - combine a small set of structure-relevant signals
    - stay strictly on bar level
    - provide a future evidence layer for anchor selection and transition scoring

    Inputs:
    - RMS energy per bar from features
    - novelty / change per bar from novelty
    - light macro-boundary context from macro_sections

    Explicit non-goals for this first version:
    - no section building
    - no segment aggregation
    - no anchor decisions
    - no transition-score calculation
    """

    rms_series = _extract_rms_series(features_payload)
    novelty_series = _extract_novelty_series(novelty_payload)
    macro_boundary_bars = _extract_macro_boundary_bars(macro_sections_payload)

    bar_count = max(
        len(rms_series),
        len(novelty_series),
        max(macro_boundary_bars) + 1 if macro_boundary_bars else 0,
    )

    if bar_count <= 0:
        return {
            "method": "rms_novelty_macro_context",
            "bar_count": 0,
            "bar_structure_strength": [],
            "bar_structure_components": [],
            "is_empty": True,
        }

    rms_strength = _pad_or_trim(_normalize_series(rms_series), bar_count)
    novelty_strength = _pad_or_trim(_normalize_series(novelty_series), bar_count)
    macro_context_strength = _build_macro_context_series(bar_count, macro_boundary_bars)

    bar_structure_strength: list[float] = []
    bar_structure_components: list[dict[str, float | int]] = []

    for bar_index in range(bar_count):
        fused_strength = (
            0.30 * rms_strength[bar_index]
            + 0.50 * novelty_strength[bar_index]
            + 0.20 * macro_context_strength[bar_index]
        )

        fused_strength = _clamp_01(fused_strength)
        bar_structure_strength.append(fused_strength)

        bar_structure_components.append(
            {
                "bar_index": bar_index,
                "rms_strength": round(rms_strength[bar_index], 6),
                "novelty_strength": round(novelty_strength[bar_index], 6),
                "macro_context_strength": round(macro_context_strength[bar_index], 6),
                "fused_strength": round(fused_strength, 6),
            }
        )

    return {
        "method": "rms_novelty_macro_context",
        "bar_count": bar_count,
        "bar_structure_strength": bar_structure_strength,
        "bar_structure_components": bar_structure_components,
        "is_empty": False,
    }
