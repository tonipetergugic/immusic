from __future__ import annotations

import numpy as np


def compute_self_similarity_matrix(bar_feature_vectors: list[list[float]]) -> list[list[float]]:
    matrix = np.asarray(bar_feature_vectors, dtype=np.float64)
    matrix = np.nan_to_num(matrix, nan=0.0, posinf=0.0, neginf=0.0)

    if matrix.ndim != 2:
        raise ValueError("Bar feature vectors must be a 2D array-like structure.")
    if matrix.shape[0] == 0 or matrix.shape[1] == 0:
        raise ValueError("Bar feature vectors must contain at least one row and one feature.")
    if matrix.shape[0] < 2:
        raise ValueError("At least 2 bar feature vectors are required to compute self-similarity.")

    feature_mean = np.mean(matrix, axis=0, keepdims=True)
    centered = matrix - feature_mean

    feature_std = np.std(matrix, axis=0, keepdims=True)
    safe_feature_std = np.where(
        np.isfinite(feature_std) & (feature_std > 1e-12),
        feature_std,
        1.0,
    )

    normalized = centered / safe_feature_std
    normalized = np.nan_to_num(normalized, nan=0.0, posinf=0.0, neginf=0.0)

    row_norms = np.linalg.norm(normalized, axis=1)
    row_norms = np.where(np.isfinite(row_norms) & (row_norms > 1e-12), row_norms, 1.0)

    rows = normalized.shape[0]
    similarity = np.empty((rows, rows), dtype=np.float64)

    for i in range(rows):
        similarity[i, i] = 1.0
        for j in range(i + 1, rows):
            value = float(np.dot(normalized[i], normalized[j]) / (row_norms[i] * row_norms[j]))
            if not np.isfinite(value):
                value = 0.0
            value = float(np.clip(value, -1.0, 1.0))
            similarity[i, j] = value
            similarity[j, i] = value

    similarity = np.nan_to_num(similarity, nan=0.0, posinf=0.0, neginf=0.0)
    np.fill_diagonal(similarity, 1.0)

    return similarity.astype(float).tolist()
