from __future__ import annotations

from statistics import mean, pstdev
from typing import Any


GLOBAL_FUSION_FLOOR = 0.15
LOCAL_STD_WEIGHT = 0.75
MICRO_EDGE_EXCLUSION_BARS = 2
MIN_MARKER_EXCESS = 0.05
MIN_PEAK_PROMINENCE = 0.04


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_component_lookup(
    fusion_payload: dict[str, Any],
) -> dict[int, dict[str, Any]]:
    components = fusion_payload.get("bar_structure_components") or []

    lookup: dict[int, dict[str, Any]] = {}

    for component in components:
        bar_index = component.get("bar_index")
        if bar_index is None:
            continue

        lookup[int(bar_index)] = {
            "bar_index": int(bar_index),
            "rms_strength": _safe_float(component.get("rms_strength")),
            "novelty_strength": _safe_float(component.get("novelty_strength")),
            "macro_context_strength": _safe_float(component.get("macro_context_strength")),
            "fused_strength": _safe_float(component.get("fused_strength")),
        }

    return lookup


def _collect_section_components(
    section: dict[str, Any],
    component_lookup: dict[int, dict[str, Any]],
) -> list[dict[str, Any]]:
    start_bar_index = int(section["start_bar_index"])
    end_bar_index = int(section["end_bar_index"])

    collected: list[dict[str, Any]] = []

    for bar_index in range(start_bar_index, end_bar_index + 1):
        component = component_lookup.get(bar_index)

        if component is None:
            collected.append(
                {
                    "bar_index": bar_index,
                    "rms_strength": None,
                    "novelty_strength": None,
                    "macro_context_strength": None,
                    "fused_strength": None,
                }
            )
            continue

        collected.append(component)

    return collected


def _collect_internal_section_components(
    section_components: list[dict[str, Any]],
    edge_exclusion_bars: int,
) -> list[dict[str, Any]]:
    if edge_exclusion_bars <= 0:
        return section_components[:]

    if len(section_components) <= edge_exclusion_bars * 2:
        return []

    return section_components[edge_exclusion_bars:-edge_exclusion_bars]


def _compute_local_peak_prominence(
    components: list[dict[str, float | int]],
    current_index: int,
) -> float:
    current_strength = float(components[current_index]["fused_strength"])

    neighbor_strengths: list[float] = []

    if current_index - 1 >= 0:
        neighbor_strengths.append(float(components[current_index - 1]["fused_strength"]))

    if current_index + 1 < len(components):
        neighbor_strengths.append(float(components[current_index + 1]["fused_strength"]))

    if not neighbor_strengths:
        return 0.0

    return current_strength - max(neighbor_strengths)


def _is_local_peak(
    section_components: list[dict[str, Any]],
    position: int,
) -> bool:
    if position <= 0 or position >= len(section_components) - 1:
        return False

    prev_strength = _safe_float(section_components[position - 1].get("fused_strength"))
    current_strength = _safe_float(section_components[position].get("fused_strength"))
    next_strength = _safe_float(section_components[position + 1].get("fused_strength"))

    if prev_strength is None or current_strength is None or next_strength is None:
        return False

    return (
        current_strength >= prev_strength
        and current_strength >= next_strength
        and (current_strength > prev_strength or current_strength > next_strength)
    )


def _build_marker(
    section_index: int,
    threshold: float,
    component: dict[str, Any],
) -> dict[str, Any]:
    fused_strength = _safe_float(component.get("fused_strength"))
    strength_over_threshold = fused_strength - threshold

    return {
        "section_index": section_index,
        "bar_index": int(component["bar_index"]),
        "fused_strength": fused_strength,
        "strength_over_threshold": strength_over_threshold,
        "rms_strength": _safe_float(component.get("rms_strength")),
        "novelty_strength": _safe_float(component.get("novelty_strength")),
        "macro_context_strength": _safe_float(component.get("macro_context_strength")),
    }


def analyze_micro_structure(
    macro_sections_payload: dict[str, Any],
    fusion_payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Initial micro-stage based on section-relative fusion strength.

    Goal:
    - detect internal change markers inside existing macro sections

    Included:
    - section-relative thresholding
    - minimal global floor
    - local peak detection on fused bar strength
    - grouped output per macro section

    Explicit non-goals:
    - no micro-section splitting
    - no boundary moving
    - no anchor selection
    - no transition scoring
    """
    macro_sections = macro_sections_payload.get("macro_sections") or []
    component_lookup = _build_component_lookup(fusion_payload)

    if not macro_sections or not component_lookup:
        return {
            "method": "section_relative_fusion_markers",
            "global_fusion_floor": GLOBAL_FUSION_FLOOR,
            "local_std_weight": LOCAL_STD_WEIGHT,
            "micro_edge_exclusion_bars": MICRO_EDGE_EXCLUSION_BARS,
            "min_marker_excess": MIN_MARKER_EXCESS,
            "min_peak_prominence": MIN_PEAK_PROMINENCE,
            "macro_section_activity": [],
            "micro_markers": [],
            "micro_marker_count": 0,
            "is_empty": True,
        }

    macro_section_activity: list[dict[str, Any]] = []
    all_markers: list[dict[str, Any]] = []

    for fallback_index, section in enumerate(macro_sections):
        section_index = int(section.get("index", fallback_index))
        start_bar_index = int(section["start_bar_index"])
        end_bar_index = int(section["end_bar_index"])

        section_components = _collect_section_components(
            section=section,
            component_lookup=component_lookup,
        )

        internal_section_components = _collect_internal_section_components(
            section_components=section_components,
            edge_exclusion_bars=MICRO_EDGE_EXCLUSION_BARS,
        )

        section_strengths = [
            float(component["fused_strength"])
            for component in internal_section_components
            if component.get("fused_strength") is not None
        ]

        local_mean_strength = mean(section_strengths) if section_strengths else None
        local_std_strength = (
            pstdev(section_strengths) if len(section_strengths) > 1 else 0.0
        )

        dynamic_threshold = GLOBAL_FUSION_FLOOR
        if local_mean_strength is not None and local_std_strength is not None:
            dynamic_threshold = max(
                GLOBAL_FUSION_FLOOR,
                local_mean_strength + (LOCAL_STD_WEIGHT * local_std_strength),
            )

        section_markers: list[dict[str, Any]] = []

        for current_index, component in enumerate(internal_section_components):
            fused_strength = _safe_float(component.get("fused_strength"))

            if fused_strength is None:
                continue

            if not _is_local_peak(internal_section_components, current_index):
                continue

            if fused_strength < dynamic_threshold:
                continue

            marker = _build_marker(
                section_index=section_index,
                threshold=dynamic_threshold,
                component=component,
            )
            peak_prominence = _compute_local_peak_prominence(
                internal_section_components, current_index
            )
            marker["peak_prominence"] = peak_prominence

            if marker["strength_over_threshold"] < MIN_MARKER_EXCESS:
                continue

            if marker["peak_prominence"] < MIN_PEAK_PROMINENCE:
                continue

            section_markers.append(marker)
            all_markers.append(marker)

        macro_section_activity.append(
            {
                "section_index": section_index,
                "start_bar_index": start_bar_index,
                "end_bar_index": end_bar_index,
                "bar_count": end_bar_index - start_bar_index + 1,
                "internal_bar_count": len(internal_section_components),
                "local_mean_strength": local_mean_strength,
                "local_std_strength": local_std_strength,
                "dynamic_threshold": dynamic_threshold,
                "marker_count": len(section_markers),
                "markers": section_markers,
            }
        )

    return {
        "method": "section_relative_fusion_markers",
        "global_fusion_floor": GLOBAL_FUSION_FLOOR,
        "local_std_weight": LOCAL_STD_WEIGHT,
        "micro_edge_exclusion_bars": MICRO_EDGE_EXCLUSION_BARS,
        "min_marker_excess": MIN_MARKER_EXCESS,
        "min_peak_prominence": MIN_PEAK_PROMINENCE,
        "macro_section_activity": macro_section_activity,
        "micro_markers": all_markers,
        "micro_marker_count": len(all_markers),
        "is_empty": len(all_markers) == 0,
    }
