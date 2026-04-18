from __future__ import annotations

from typing import Any

import numpy as np
from scipy.signal import find_peaks


def _to_2d_array(matrix: list[list[float]]) -> np.ndarray:
    array = np.asarray(matrix, dtype=np.float32)

    if array.ndim != 2:
        raise ValueError("similarity matrix must be a 2D list")

    return array


def _build_checkerboard_kernel(radius: int) -> np.ndarray:
    size = radius * 2
    kernel = np.ones((size, size), dtype=np.float32)

    kernel[:radius, radius:] = -1.0
    kernel[radius:, :radius] = -1.0

    return kernel


def _compute_novelty_curve(similarity_matrix: np.ndarray, kernel_radius: int) -> np.ndarray:
    bar_count = similarity_matrix.shape[0]
    novelty = np.zeros(bar_count, dtype=np.float32)

    if bar_count == 0:
        return novelty

    kernel = _build_checkerboard_kernel(kernel_radius)
    window_size = kernel_radius * 2

    if bar_count < window_size:
        return novelty

    for center in range(kernel_radius, bar_count - kernel_radius):
        patch = similarity_matrix[
            center - kernel_radius : center + kernel_radius,
            center - kernel_radius : center + kernel_radius,
        ]

        if patch.shape != kernel.shape:
            continue

        novelty[center] = float(np.sum(patch * kernel))

    novelty = np.maximum(novelty, 0.0)

    max_value = float(np.max(novelty)) if novelty.size > 0 else 0.0
    if max_value > 0.0:
        novelty = novelty / max_value

    return novelty


def analyze_novelty(
    similarity_matrix: list[list[float]],
    bars: list[dict[str, float | int]],
    kernel_radius: int = 8,
    peak_height: float = 0.1,
    peak_distance_bars: int = 4,
) -> dict[str, Any]:
    if not similarity_matrix:
        return {
            "method": "checkerboard_novelty_on_self_similarity",
            "kernel_radius": kernel_radius,
            "peak_height": peak_height,
            "peak_distance_bars": peak_distance_bars,
            "novelty_curve": [],
            "boundary_candidates": [],
            "candidate_count": 0,
            "is_empty": True,
        }

    matrix = _to_2d_array(similarity_matrix)
    novelty_curve = _compute_novelty_curve(matrix, kernel_radius)

    peak_indices, _ = find_peaks(
        novelty_curve,
        height=peak_height,
        distance=peak_distance_bars,
    )

    boundary_candidates: list[dict[str, float | int]] = []

    for peak_index in peak_indices:
        bar_index = int(peak_index)
        start_sec = 0.0

        if 0 <= bar_index < len(bars):
            start_sec = float(bars[bar_index]["start"])

        boundary_candidates.append(
            {
                "bar_index": bar_index,
                "time_sec": start_sec,
                "score": float(novelty_curve[bar_index]),
            }
        )

    return {
        "method": "checkerboard_novelty_on_self_similarity",
        "kernel_radius": kernel_radius,
        "peak_height": peak_height,
        "peak_distance_bars": peak_distance_bars,
        "novelty_curve": novelty_curve.tolist(),
        "boundary_candidates": boundary_candidates,
        "candidate_count": len(boundary_candidates),
        "is_empty": False,
    }
