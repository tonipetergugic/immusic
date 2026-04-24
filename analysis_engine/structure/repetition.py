from __future__ import annotations

from typing import Any

import numpy as np


MIN_REPEAT_DISTANCE_BARS = 8
REPEAT_SIMILARITY_FLOOR = 0.75


def _compute_macro_form_fallback(total_bars: int | None, segment_count: int | None) -> float | None:
    if total_bars is None or segment_count is None:
        return None

    if total_bars <= 0 or segment_count <= 0:
        return None

    bars_per_segment = total_bars / segment_count
    normalized = (bars_per_segment - 4.0) / (32.0 - 4.0)

    if normalized < 0.0:
        return 0.0
    if normalized > 1.0:
        return 1.0

    return float(normalized)


def _to_feature_matrix(bar_feature_vectors: Any) -> np.ndarray | None:
    if not isinstance(bar_feature_vectors, list) or not bar_feature_vectors:
        return None

    try:
        matrix = np.asarray(bar_feature_vectors, dtype=np.float32)
    except (TypeError, ValueError):
        return None

    if matrix.ndim != 2 or matrix.shape[0] < MIN_REPEAT_DISTANCE_BARS + 2:
        return None

    if matrix.shape[1] <= 0:
        return None

    return matrix


def _zscore_features(matrix: np.ndarray) -> np.ndarray:
    means = np.mean(matrix, axis=0, keepdims=True)
    stds = np.std(matrix, axis=0, keepdims=True)
    stds = np.where(stds < 1e-8, 1.0, stds)
    return (matrix - means) / stds


def _normalize_rows(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms = np.where(norms < 1e-8, 1.0, norms)
    return matrix / norms


def compute_repetition_score(
    bar_feature_vectors: Any = None,
    total_bars: int | None = None,
    segment_count: int | None = None,
) -> float | None:
    """
    Compute an artist-facing repetition score from real bar-level feature reuse.

    Interpretation:
    - higher score => many bars strongly resemble earlier, non-adjacent bars
    - lower score => less reusable / less loop-like bar-feature material

    Near-neighbor bars are intentionally ignored so normal local continuity does not
    inflate the score. If bar features are unavailable, the old macro-form baseline
    is used as a safe fallback.
    """
    matrix = _to_feature_matrix(bar_feature_vectors)
    if matrix is None:
        return _compute_macro_form_fallback(total_bars, segment_count)

    normalized = _normalize_rows(_zscore_features(matrix))
    similarity_matrix = normalized @ normalized.T
    similarity_matrix = np.clip(similarity_matrix, -1.0, 1.0)

    repeat_strengths: list[float] = []

    for bar_index in range(MIN_REPEAT_DISTANCE_BARS, similarity_matrix.shape[0]):
        comparison_end = bar_index - MIN_REPEAT_DISTANCE_BARS + 1
        if comparison_end <= 0:
            continue

        previous_similarities = similarity_matrix[bar_index, :comparison_end]
        if previous_similarities.size == 0:
            continue

        best_similarity = float(np.max(previous_similarities))
        normalized_similarity = (best_similarity + 1.0) / 2.0
        normalized_similarity = max(0.0, min(1.0, normalized_similarity))

        repeat_strength = (normalized_similarity - REPEAT_SIMILARITY_FLOOR) / (
            1.0 - REPEAT_SIMILARITY_FLOOR
        )
        repeat_strength = max(0.0, min(1.0, repeat_strength))
        repeat_strengths.append(float(repeat_strength))

    if not repeat_strengths:
        return 0.0

    return float(np.mean(repeat_strengths))
