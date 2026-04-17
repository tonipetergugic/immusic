from __future__ import annotations

from typing import Any

import numpy as np

from schemas import Bar


CHROMA_PREFIX = "chroma_"


def compute_melodic_motion(
    *,
    feature_names: list[str],
    bar_feature_vectors: list[list[float]],
    bars: list[Bar],
) -> dict[str, Any]:
    _validate_inputs(
        feature_names=feature_names,
        bar_feature_vectors=bar_feature_vectors,
        bars=bars,
    )

    chroma_indices = _resolve_chroma_indices(feature_names)
    chroma_matrix = _build_chroma_matrix(
        bar_feature_vectors=bar_feature_vectors,
        chroma_indices=chroma_indices,
    )

    normalized = _normalize_rows(chroma_matrix)
    dominant_pitch_classes = _dominant_pitch_classes(normalized)
    dominant_pitch_strengths = _dominant_pitch_strengths(normalized)
    entropy_curve = _chroma_entropy_curve(normalized)
    similarity_curve = _adjacent_similarity_curve(normalized)
    motion_curve = [float(1.0 - value) for value in similarity_curve]
    pitch_shift_curve = _pitch_shift_curve(dominant_pitch_classes)

    stable_spans = _find_stable_spans(
        bars=bars,
        motion_curve=motion_curve,
        pitch_shift_curve=pitch_shift_curve,
    )

    stable_bar_count = sum(
        int(span["length_bars"])
        for span in stable_spans
    )
    total_bar_count = len(bars)

    return {
        "global_motion_score": float(np.mean(motion_curve[1:])) if len(motion_curve) > 1 else 0.0,
        "global_entropy_score": float(np.mean(entropy_curve)) if entropy_curve else 0.0,
        "global_pitch_focus_score": float(np.mean(dominant_pitch_strengths)) if dominant_pitch_strengths else 0.0,
        "stable_pitch_bar_ratio": float(stable_bar_count / total_bar_count) if total_bar_count > 0 else 0.0,
        "dominant_pitch_classes": dominant_pitch_classes,
        "dominant_pitch_strengths": dominant_pitch_strengths,
        "adjacent_similarity_curve": similarity_curve,
        "motion_curve": motion_curve,
        "pitch_shift_curve": pitch_shift_curve,
        "entropy_curve": entropy_curve,
        "stable_pitch_spans": stable_spans,
    }


def _validate_inputs(
    *,
    feature_names: list[str],
    bar_feature_vectors: list[list[float]],
    bars: list[Bar],
) -> None:
    if not feature_names:
        raise ValueError("feature_names must not be empty")
    if not bar_feature_vectors:
        raise ValueError("bar_feature_vectors must not be empty")
    if not bars:
        raise ValueError("bars must not be empty")
    if len(bar_feature_vectors) != len(bars):
        raise ValueError("bar_feature_vectors and bars must have the same length")
    expected_length = len(feature_names)
    for vector in bar_feature_vectors:
        if len(vector) != expected_length:
            raise ValueError("all bar feature vectors must match feature_names length")


def _resolve_chroma_indices(feature_names: list[str]) -> list[int]:
    indices = [
        index
        for index, name in enumerate(feature_names)
        if name.startswith(CHROMA_PREFIX)
    ]
    if len(indices) != 12:
        raise ValueError("expected exactly 12 chroma features")
    return indices


def _build_chroma_matrix(
    *,
    bar_feature_vectors: list[list[float]],
    chroma_indices: list[int],
) -> np.ndarray:
    matrix = np.asarray(
        [
            [float(vector[index]) for index in chroma_indices]
            for vector in bar_feature_vectors
        ],
        dtype=np.float64,
    )
    if matrix.ndim != 2 or matrix.shape[1] != 12:
        raise ValueError("chroma matrix must have shape [bars, 12]")
    return matrix


def _normalize_rows(matrix: np.ndarray) -> np.ndarray:
    row_sums = matrix.sum(axis=1, keepdims=True)
    safe_row_sums = np.where(row_sums <= 1e-12, 1.0, row_sums)
    return matrix / safe_row_sums


def _dominant_pitch_classes(matrix: np.ndarray) -> list[int]:
    return [int(np.argmax(row)) for row in matrix]


def _dominant_pitch_strengths(matrix: np.ndarray) -> list[float]:
    return [float(np.max(row)) for row in matrix]


def _chroma_entropy_curve(matrix: np.ndarray) -> list[float]:
    values: list[float] = []
    for row in matrix:
        safe = np.clip(row, 1e-12, 1.0)
        entropy = -np.sum(safe * np.log2(safe)) / np.log2(12.0)
        values.append(float(np.clip(entropy, 0.0, 1.0)))
    return values


def _adjacent_similarity_curve(matrix: np.ndarray) -> list[float]:
    values: list[float] = [0.0]
    for index in range(1, len(matrix)):
        previous = matrix[index - 1]
        current = matrix[index]
        similarity = _cosine_similarity(previous, current)
        values.append(float(np.clip(similarity, 0.0, 1.0)))
    return values


def _pitch_shift_curve(dominant_pitch_classes: list[int]) -> list[float]:
    values: list[float] = [0.0]
    for index in range(1, len(dominant_pitch_classes)):
        previous = dominant_pitch_classes[index - 1]
        current = dominant_pitch_classes[index]
        raw_distance = abs(current - previous)
        wrapped_distance = min(raw_distance, 12 - raw_distance)
        normalized_distance = wrapped_distance / 6.0
        values.append(float(np.clip(normalized_distance, 0.0, 1.0)))
    return values


def _find_stable_spans(
    *,
    bars: list[Bar],
    motion_curve: list[float],
    pitch_shift_curve: list[float],
) -> list[dict[str, float | int]]:
    spans: list[dict[str, float | int]] = []

    start_index: int | None = None

    for index, (motion_value, shift_value) in enumerate(zip(motion_curve, pitch_shift_curve)):
        is_stable = motion_value <= 0.18 and shift_value <= 0.17

        if is_stable and start_index is None:
            start_index = index
            continue

        if not is_stable and start_index is not None:
            _append_span(
                spans=spans,
                bars=bars,
                motion_curve=motion_curve,
                pitch_shift_curve=pitch_shift_curve,
                start_index=start_index,
                end_index=index - 1,
            )
            start_index = None

    if start_index is not None:
        _append_span(
            spans=spans,
            bars=bars,
            motion_curve=motion_curve,
            pitch_shift_curve=pitch_shift_curve,
            start_index=start_index,
            end_index=len(bars) - 1,
        )

    return [span for span in spans if int(span["length_bars"]) >= 4]


def _append_span(
    *,
    spans: list[dict[str, float | int]],
    bars: list[Bar],
    motion_curve: list[float],
    pitch_shift_curve: list[float],
    start_index: int,
    end_index: int,
) -> None:
    segment_motion = motion_curve[start_index : end_index + 1]
    segment_shift = pitch_shift_curve[start_index : end_index + 1]

    spans.append(
        {
            "start_bar": start_index,
            "end_bar": end_index,
            "start_time_sec": float(bars[start_index].start),
            "end_time_sec": float(bars[end_index].end),
            "length_bars": int(end_index - start_index + 1),
            "length_sec": float(bars[end_index].end - bars[start_index].start),
            "mean_motion": float(np.mean(segment_motion)),
            "mean_pitch_shift": float(np.mean(segment_shift)),
        }
    )


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom <= 1e-12:
        return 0.0
    return float(np.dot(a, b) / denom)

