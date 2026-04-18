from __future__ import annotations

from typing import Any

import numpy as np


def _to_2d_array(bar_feature_vectors: list[list[float]]) -> np.ndarray:
    matrix = np.asarray(bar_feature_vectors, dtype=np.float32)

    if matrix.ndim != 2:
        raise ValueError("bar_feature_vectors must be a 2D list")

    return matrix


def _zscore_features(matrix: np.ndarray) -> np.ndarray:
    means = np.mean(matrix, axis=0, keepdims=True)
    stds = np.std(matrix, axis=0, keepdims=True)
    stds = np.where(stds == 0.0, 1.0, stds)
    return (matrix - means) / stds


def _normalize_rows(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms = np.where(norms == 0.0, 1.0, norms)
    return matrix / norms


def analyze_similarity(bar_feature_vectors: list[list[float]]) -> dict[str, Any]:
    if not bar_feature_vectors:
        return {
            "method": "cosine_similarity_on_zscored_bar_features",
            "bar_count": 0,
            "feature_count": 0,
            "matrix": [],
            "is_empty": True,
        }

    feature_matrix = _to_2d_array(bar_feature_vectors)
    standardized = _zscore_features(feature_matrix)
    normalized = _normalize_rows(standardized)
    similarity_matrix = normalized @ normalized.T
    similarity_matrix = np.clip(similarity_matrix, -1.0, 1.0)

    return {
        "method": "cosine_similarity_on_zscored_bar_features",
        "bar_count": int(similarity_matrix.shape[0]),
        "feature_count": int(feature_matrix.shape[1]),
        "matrix": similarity_matrix.tolist(),
        "is_empty": False,
    }
