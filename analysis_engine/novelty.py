from __future__ import annotations

import numpy as np


def _smooth_novelty_curve(novelty: np.ndarray) -> np.ndarray:
    if novelty.size < 3:
        return novelty
    kernel = np.asarray([0.25, 0.5, 0.25], dtype=np.float64)
    smoothed = np.convolve(novelty, kernel, mode="same")
    return np.nan_to_num(smoothed, nan=0.0, posinf=0.0, neginf=0.0)


def _non_maximum_suppression(
    peaks: list[int],
    values: np.ndarray,
    min_peak_distance_bars: int,
) -> list[int]:
    if not peaks:
        return []

    ranked = sorted(
        peaks,
        key=lambda index: (float(values[index]), -int(index)),
        reverse=True,
    )
    selected: list[int] = []

    for peak_index in ranked:
        if all(abs(peak_index - kept_index) >= min_peak_distance_bars for kept_index in selected):
            selected.append(int(peak_index))

    return sorted(set(selected))


def _make_checkerboard_kernel(kernel_size: int) -> np.ndarray:
    if kernel_size < 2:
        raise ValueError("kernel_size must be at least 2.")

    if kernel_size % 2 != 0:
        kernel_size += 1

    half = kernel_size // 2
    kernel = np.ones((kernel_size, kernel_size), dtype=np.float64)

    kernel[:half, :half] = 1.0
    kernel[half:, half:] = 1.0
    kernel[:half, half:] = -1.0
    kernel[half:, :half] = -1.0

    return kernel


def compute_novelty_curve(
    self_similarity_matrix: list[list[float]],
    kernel_size: int = 16,
) -> list[float]:
    ssm = np.asarray(self_similarity_matrix, dtype=np.float64)
    ssm = np.nan_to_num(ssm, nan=0.0, posinf=0.0, neginf=0.0)

    if ssm.ndim != 2:
        raise ValueError("Self-similarity matrix must be 2-dimensional.")
    if ssm.shape[0] == 0 or ssm.shape[1] == 0:
        raise ValueError("Self-similarity matrix must not be empty.")
    if ssm.shape[0] != ssm.shape[1]:
        raise ValueError("Self-similarity matrix must be square.")

    n = ssm.shape[0]
    if n < 4:
        return [0.0 for _ in range(n)]

    kernel_size = min(kernel_size, n if n % 2 == 0 else n - 1)
    if kernel_size < 2:
        return [0.0 for _ in range(n)]
    if kernel_size % 2 != 0:
        kernel_size -= 1

    kernel = _make_checkerboard_kernel(kernel_size)
    half = kernel_size // 2

    padded = np.pad(ssm, ((half, half), (half, half)), mode="constant", constant_values=0.0)

    novelty = np.zeros(n, dtype=np.float64)

    for i in range(n):
        window = padded[i : i + kernel_size, i : i + kernel_size]
        novelty[i] = float(np.sum(window * kernel))

    novelty = np.maximum(novelty, 0.0)

    max_value = float(np.max(novelty))
    if max_value > 0.0:
        novelty = novelty / max_value

    return novelty.astype(float).tolist()


def detect_boundary_candidates(
    novelty_curve: list[float],
    threshold_ratio: float = 0.30,
    min_peak_distance_bars: int = 4,
) -> list[int]:
    novelty = np.asarray(novelty_curve, dtype=np.float64)

    if novelty.ndim != 1 or novelty.size == 0:
        return []

    novelty = np.nan_to_num(novelty, nan=0.0, posinf=0.0, neginf=0.0)
    novelty = np.maximum(novelty, 0.0)
    smoothed_novelty = _smooth_novelty_curve(novelty)

    peak_threshold = float(np.max(smoothed_novelty)) * float(threshold_ratio)
    if peak_threshold <= 0.0:
        return []

    candidates: list[int] = []

    for i in range(1, len(smoothed_novelty) - 1):
        current_value = float(smoothed_novelty[i])
        if current_value < peak_threshold:
            continue
        if current_value > float(smoothed_novelty[i - 1]) and current_value > float(smoothed_novelty[i + 1]):
            candidates.append(i)

    return _non_maximum_suppression(
        candidates,
        smoothed_novelty,
        min_peak_distance_bars=max(1, int(min_peak_distance_bars)),
    )
