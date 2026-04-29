from __future__ import annotations

from math import isfinite
from statistics import median
from typing import Any, Iterable


def build_section_character_summary(result: Any) -> dict[str, Any]:
    """
    Build a compact, artist-facing character summary for larger structural sections.

    This is a derived Consultant hint layer. It must stay cautious and must not
    become a hard diagnosis of drops, builds, melodies, loops, or samples.
    """
    segments = _structure_segments(result)
    if not segments:
        return {
            "status": "unavailable",
            "reason": "No stable structure segments available.",
        }

    loudness_points = _short_term_loudness_points(result)
    transient_items = _transient_timeline_items(result)

    if not loudness_points and not transient_items:
        return {
            "status": "unavailable",
            "reason": "No section-level energy or density basis available.",
        }

    section_stats: list[dict[str, Any]] = []
    energy_values: list[float] = []
    density_values: list[float] = []

    for segment in segments:
        start_sec = _as_float(_get(segment, "start_sec"))
        end_sec = _as_float(_get(segment, "end_sec"))
        if start_sec is None or end_sec is None or end_sec <= start_sec:
            continue

        section_loudness = [
            value
            for time_sec, value in loudness_points
            if start_sec <= time_sec <= end_sec
        ]
        section_density = [
            value
            for item_start, item_end, value in transient_items
            if item_end >= start_sec and item_start <= end_sec
        ]

        avg_energy = _mean(section_loudness)
        avg_density = _mean(section_density)

        if avg_energy is not None:
            energy_values.append(avg_energy)
        if avg_density is not None:
            density_values.append(avg_density)

        section_stats.append(
            {
                "start_sec": start_sec,
                "end_sec": end_sec,
                "duration_sec": end_sec - start_sec,
                "avg_energy": avg_energy,
                "avg_density": avg_density,
                "energy_movement": _series_movement(section_loudness, threshold=1.5),
                "density_movement": _series_movement(
                    section_density,
                    threshold=_density_threshold(section_density),
                ),
            }
        )

    if not section_stats:
        return {
            "status": "unavailable",
            "reason": "No valid structure sections available.",
        }

    sections: list[dict[str, str]] = []

    for index, stats in enumerate(section_stats):
        energy_level = _relative_level(stats.get("avg_energy"), energy_values)
        density_level = _relative_level(stats.get("avg_density"), density_values)
        movement = _combined_movement(
            stats.get("energy_movement"),
            stats.get("density_movement"),
        )

        sections.append(
            {
                "position": _section_position(index, len(section_stats)),
                "duration_character": _duration_character(stats["duration_sec"]),
                "energy_level": energy_level,
                "density_level": density_level,
                "movement": movement,
                "relative_role": _relative_role(
                    index,
                    len(section_stats),
                    energy_level,
                    density_level,
                ),
            }
        )

    return {
        "status": "available",
        "overall": {
            "energy_profile": _overall_profile(energy_values),
            "density_profile": _overall_profile(density_values),
        },
        "sections": sections,
        "wording_note": (
            "Use this only as cautious section-character evidence. Do not expose "
            "internal section counts, scores, bar data, or diagnose motifs, loops, "
            "samples, drops, builds, breaks, verses, or outros from this alone."
        ),
    }


def _structure_segments(result: Any) -> list[Any]:
    structure = getattr(result, "structure", None)
    segments = getattr(structure, "segments", None)
    if isinstance(segments, list):
        return segments
    return []


def _short_term_loudness_points(result: Any) -> list[tuple[float, float]]:
    loudness = getattr(result, "loudness", None)
    series = getattr(loudness, "short_term_lufs_series", None)

    if getattr(series, "status", None) != "available":
        return []

    points: list[tuple[float, float]] = []

    for point in getattr(series, "points", []) or []:
        time_sec = _as_float(_get(point, "t"))
        value = _as_float(_get(point, "lufs_s"))
        if time_sec is not None and value is not None:
            points.append((time_sec, value))

    return points


def _transient_timeline_items(result: Any) -> list[tuple[float, float, float]]:
    transients = getattr(result, "transients", None)

    if getattr(transients, "status", None) != "available":
        return []

    items: list[tuple[float, float, float]] = []

    for item in getattr(transients, "timeline", []) or []:
        start_sec = _as_float(_get(item, "start_sec"))
        end_sec = _as_float(_get(item, "end_sec"))
        density = _as_float(_get(item, "density_per_sec"))

        if start_sec is not None and end_sec is not None and density is not None:
            items.append((start_sec, end_sec, density))

    return items


def _get(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        return value.get(key)
    return getattr(value, key, None)


def _as_float(value: Any) -> float | None:
    if not isinstance(value, (int, float)):
        return None

    number = float(value)
    if not isfinite(number):
        return None

    return number


def _mean(values: Iterable[float]) -> float | None:
    clean_values = [value for value in values if isfinite(value)]

    if not clean_values:
        return None

    return sum(clean_values) / len(clean_values)


def _relative_level(value: Any, all_values: list[float]) -> str:
    number = _as_float(value)

    if number is None or len(all_values) < 2:
        return "unknown"

    sorted_values = sorted(all_values)
    low_cut = _percentile(sorted_values, 0.33)
    high_cut = _percentile(sorted_values, 0.66)

    if number <= low_cut:
        return "low"
    if number >= high_cut:
        return "high"

    return "moderate"


def _percentile(sorted_values: list[float], fraction: float) -> float:
    if not sorted_values:
        return 0.0

    index = round((len(sorted_values) - 1) * fraction)
    index = max(0, min(len(sorted_values) - 1, index))

    return sorted_values[index]


def _series_movement(values: list[float], threshold: float) -> str:
    clean_values = [value for value in values if isfinite(value)]

    if len(clean_values) < 4:
        return "unknown"

    third = max(1, len(clean_values) // 3)
    early = median(clean_values[:third])
    late = median(clean_values[-third:])
    delta = late - early

    if delta >= threshold:
        return "rising"
    if delta <= -threshold:
        return "falling"

    return "stable"


def _density_threshold(values: list[float]) -> float:
    clean_values = [value for value in values if isfinite(value)]

    if not clean_values:
        return 0.5

    return max(0.5, median(clean_values) * 0.2)


def _combined_movement(energy_movement: Any, density_movement: Any) -> str:
    movements = {str(energy_movement), str(density_movement)} - {"unknown"}

    if not movements:
        return "unknown"
    if movements == {"stable"}:
        return "stable"
    if movements <= {"rising", "stable"}:
        return "rising"
    if movements <= {"falling", "stable"}:
        return "falling"

    return "changing"


def _section_position(index: int, count: int) -> str:
    if index == 0:
        return "opening"
    if index == count - 1:
        return "closing"
    if index < count / 3:
        return "early"
    if index >= (count * 2) / 3:
        return "late"

    return "middle"


def _duration_character(duration_sec: float) -> str:
    if duration_sec < 25.0:
        return "short"
    if duration_sec <= 55.0:
        return "medium"

    return "extended"


def _relative_role(
    index: int,
    count: int,
    energy_level: str,
    density_level: str,
) -> str:
    if index == 0:
        return "opening_area"
    if index == count - 1:
        return "closing_area"
    if energy_level == "high" and density_level == "high":
        return "stronger_area"
    if energy_level == "low" and density_level == "low":
        return "reduced_area"

    return "main_area"


def _overall_profile(values: list[float]) -> str:
    if len(values) < 2:
        return "unknown"

    value_range = max(values) - min(values)
    reference = max(1.0, abs(median(values)))
    relative_range = value_range / reference

    if relative_range < 0.08:
        return "mostly_stable"
    if relative_range < 0.22:
        return "moderate_movement"

    return "varied"
