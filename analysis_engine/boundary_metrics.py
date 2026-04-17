from __future__ import annotations

from typing import Sequence


def compute_neighborhood_density(
    values: Sequence[float],
    center_index: int,
    *,
    radius: int = 2,
    relative_floor: float = 0.5,
) -> float:
    if not values:
        return 0.0

    if center_index < 0 or center_index >= len(values):
        return 0.0

    center_value = float(values[center_index])
    if center_value <= 0.0:
        return 0.0

    start = max(0, center_index - radius)
    end = min(len(values), center_index + radius + 1)

    neighbor_indices = [idx for idx in range(start, end) if idx != center_index]
    if not neighbor_indices:
        return 0.0

    threshold = center_value * relative_floor
    crowded_neighbors = sum(
        1 for idx in neighbor_indices if float(values[idx]) >= threshold
    )

    return crowded_neighbors / len(neighbor_indices)


def compute_local_contrast(
    values: Sequence[float],
    center_index: int,
    *,
    radius: int = 2,
) -> float:
    if not values:
        return 0.0

    if center_index < 0 or center_index >= len(values):
        return 0.0

    center_value = float(values[center_index])
    if center_value <= 0.0:
        return 0.0

    start = max(0, center_index - radius)
    end = min(len(values), center_index + radius + 1)

    neighbor_values = [
        float(values[idx])
        for idx in range(start, end)
        if idx != center_index
    ]

    if not neighbor_values:
        return 0.0

    neighbor_mean = sum(neighbor_values) / len(neighbor_values)
    raw_contrast = max(0.0, center_value - neighbor_mean)

    return raw_contrast / center_value


def compute_peak_dominance(
    novelty_curve: list[float],
    center_index: int,
    radius: int = 4,
) -> float:
    if not novelty_curve:
        return 0.0

    if center_index < 0 or center_index >= len(novelty_curve):
        return 0.0

    start_index = max(0, center_index - radius)
    end_index = min(len(novelty_curve), center_index + radius + 1)

    window = [float(value) for value in novelty_curve[start_index:end_index]]
    if not window:
        return 0.0

    center_value = float(novelty_curve[center_index])
    window_max = max(window)

    if window_max <= 0.0:
        return 0.0

    dominance = center_value / window_max
    return max(0.0, min(1.0, float(dominance)))
