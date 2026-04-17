from __future__ import annotations

from math import sqrt
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


def _clamp01(value: float) -> float:
    if value <= 0.0:
        return 0.0
    if value >= 1.0:
        return 1.0
    return float(value)


def _safe_bar_slice(bars: Sequence[Any], start_index: int, end_index: int) -> list[Any]:
    if not bars:
        return []

    start = max(0, _safe_int(start_index, 0))
    end = min(len(bars) - 1, _safe_int(end_index, -1))
    if end < start:
        return []

    return list(bars[start : end + 1])


def _extract_feature_vector(bar: Any) -> list[float]:
    if bar is None:
        return []

    if isinstance(bar, (list, tuple)):
        values: list[float] = []
        for item in bar:
            try:
                values.append(float(item))
            except (TypeError, ValueError):
                return []
        return values

    raw = None

    if isinstance(bar, dict):
        raw = bar.get("feature_vector")
        if raw is None:
            raw = bar.get("features")
    else:
        raw = getattr(bar, "feature_vector", None)
        if raw is None:
            raw = getattr(bar, "features", None)

    if not isinstance(raw, (list, tuple)):
        return []

    values: list[float] = []
    for item in raw:
        try:
            values.append(float(item))
        except (TypeError, ValueError):
            return []

    return values


def _mean_vector(vectors: Sequence[Sequence[float]]) -> list[float]:
    if not vectors:
        return []

    length = len(vectors[0])
    if length == 0:
        return []

    for vec in vectors:
        if len(vec) != length:
            return []

    sums = [0.0] * length
    for vec in vectors:
        for idx, value in enumerate(vec):
            sums[idx] += float(value)

    count = float(len(vectors))
    return [value / count for value in sums]


def _euclidean_distance(left: Sequence[float], right: Sequence[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    return sqrt(sum((float(a) - float(b)) ** 2 for a, b in zip(left, right)))


def _extract_section_bounds(section: Any) -> tuple[int, int]:
    if section is None:
        return 0, -1

    if isinstance(section, dict):
        start = section.get("start_bar_index", 0)
        end = section.get("end_bar_index", -1)
    else:
        start = getattr(section, "start_bar_index", 0)
        end = getattr(section, "end_bar_index", -1)

    return _safe_int(start, 0), _safe_int(end, -1)


def compute_section_progression_strengths(
    sections: Sequence[Any],
    bars: Sequence[Any],
) -> dict[int, float]:
    if not sections or not bars or len(sections) < 2:
        return {}

    indexed_centroids: list[tuple[int, list[float]]] = []

    for section_index, section in enumerate(sections):
        start_bar_index, end_bar_index = _extract_section_bounds(section)
        section_bars = _safe_bar_slice(bars, start_bar_index, end_bar_index)
        if not section_bars:
            continue

        vectors = []
        for bar in section_bars:
            vector = _extract_feature_vector(bar)
            if vector:
                vectors.append(vector)

        centroid = _mean_vector(vectors)
        if centroid:
            indexed_centroids.append((int(section_index), centroid))

    if len(indexed_centroids) < 2:
        return {}

    strengths: dict[int, float] = {}

    for centroid_pos, (section_index, centroid) in enumerate(indexed_centroids):
        if centroid_pos == 0:
            next_centroid = indexed_centroids[centroid_pos + 1][1]
            distance = _euclidean_distance(centroid, next_centroid)
            if distance > 0.0:
                strengths[int(section_index)] = float(distance)
            continue

        if centroid_pos == len(indexed_centroids) - 1:
            previous_centroid = indexed_centroids[centroid_pos - 1][1]
            distance = _euclidean_distance(previous_centroid, centroid)
            if distance > 0.0:
                strengths[int(section_index)] = float(distance)
            continue

        previous_centroid = indexed_centroids[centroid_pos - 1][1]
        next_centroid = indexed_centroids[centroid_pos + 1][1]
        previous_distance = _euclidean_distance(previous_centroid, centroid)
        next_distance = _euclidean_distance(centroid, next_centroid)

        if previous_distance > 0.0 and next_distance > 0.0:
            strengths[int(section_index)] = float(
                (previous_distance + next_distance) / 2.0
            )

    return strengths
