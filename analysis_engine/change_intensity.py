from __future__ import annotations

from typing import Sequence

import numpy as np

from schemas import Bar, ChangeBarMetrics, ChangeIntensityMetrics, Span


LOW_CHANGE_QUANTILE = 0.30
HIGH_CHANGE_QUANTILE = 0.70
MIN_SPAN_BARS = 4
SMOOTHING_WINDOW_BARS = 4
COMPRESSION_EXPONENT = 1.5
EPSILON = 1e-9

ENERGY_FEATURE_NAMES = {
    "rms_mean",
    "low_band_energy_mean",
    "mid_band_energy_mean",
    "high_band_energy_mean",
}

RHYTHMIC_FEATURE_NAMES = {
    "onset_strength_mean",
    "zero_crossing_rate_mean",
}

SPECTRAL_FEATURE_PREFIXES = (
    "spectral_",
    "mfcc_",
)


def compute_change_intensity(
    bars: list[Bar],
    feature_names: list[str],
    bar_feature_vectors: list[list[float]],
) -> ChangeIntensityMetrics:
    if not _has_valid_inputs(bars, feature_names, bar_feature_vectors):
        return _empty_change_intensity()

    matrix = _build_feature_matrix(bar_feature_vectors)
    if matrix is None:
        return _empty_change_intensity()

    normalized_matrix, normalized_feature_names = _robust_normalize_features(matrix, feature_names)
    if normalized_matrix.shape[0] < 2 or normalized_matrix.shape[1] == 0:
        return _empty_change_intensity()

    energy_indices, spectral_indices, rhythmic_indices = _resolve_feature_group_indices(normalized_feature_names)

    energy_scores = _compute_group_scores(normalized_matrix, energy_indices)
    spectral_scores = _compute_group_scores(normalized_matrix, spectral_indices)
    rhythmic_scores = _compute_group_scores(normalized_matrix, rhythmic_indices)

    if not energy_scores and not spectral_scores and not rhythmic_scores:
        return _empty_change_intensity()

    energy_scores = _compress_scores(energy_scores)
    spectral_scores = _compress_scores(spectral_scores)
    rhythmic_scores = _compress_scores(rhythmic_scores)

    combined_scores = _combine_component_scores(
        energy_scores=energy_scores,
        spectral_scores=spectral_scores,
        rhythmic_scores=rhythmic_scores,
    )
    smoothed_curve = _moving_average(combined_scores, SMOOTHING_WINDOW_BARS)

    low_change_spans = _extract_spans(
        bars=bars,
        curve=smoothed_curve,
        mode="low",
        quantile=LOW_CHANGE_QUANTILE,
        min_span_bars=MIN_SPAN_BARS,
    )
    high_change_spans = _extract_spans(
        bars=bars,
        curve=smoothed_curve,
        mode="high",
        quantile=HIGH_CHANGE_QUANTILE,
        min_span_bars=MIN_SPAN_BARS,
    )

    global_score = float(np.clip(np.mean(smoothed_curve), 0.0, 1.0)) if smoothed_curve else 0.0
    activity_label = _activity_label_from_score(global_score)

    per_bar = _build_per_bar_metrics(
        bars=bars,
        energy_scores=energy_scores,
        spectral_scores=spectral_scores,
        rhythmic_scores=rhythmic_scores,
        combined_scores=combined_scores,
    )

    return ChangeIntensityMetrics(
        global_score=global_score,
        activity_label=activity_label,
        per_bar=per_bar,
        smoothed_curve=smoothed_curve,
        low_change_spans=low_change_spans,
        high_change_spans=high_change_spans,
    )


def _empty_change_intensity() -> ChangeIntensityMetrics:
    return ChangeIntensityMetrics(
        global_score=0.0,
        activity_label="very_sparse",
        per_bar=[],
        smoothed_curve=[],
        low_change_spans=[],
        high_change_spans=[],
    )


def _has_valid_inputs(
    bars: list[Bar],
    feature_names: list[str],
    bar_feature_vectors: list[list[float]],
) -> bool:
    if not bars or not feature_names or not bar_feature_vectors:
        return False
    if len(bars) != len(bar_feature_vectors):
        return False
    if len(bars) < 2:
        return False
    expected_width = len(feature_names)
    if expected_width == 0:
        return False
    for row in bar_feature_vectors:
        if len(row) != expected_width:
            return False
    return True


def _build_feature_matrix(bar_feature_vectors: list[list[float]]) -> np.ndarray | None:
    try:
        matrix = np.asarray(bar_feature_vectors, dtype=np.float64)
    except (TypeError, ValueError):
        return None

    if matrix.ndim != 2:
        return None
    if matrix.shape[0] < 2 or matrix.shape[1] == 0:
        return None
    if not np.all(np.isfinite(matrix)):
        return None

    return matrix


def _robust_normalize_features(
    matrix: np.ndarray,
    feature_names: list[str],
) -> tuple[np.ndarray, list[str]]:
    medians = np.median(matrix, axis=0)
    q75 = np.percentile(matrix, 75, axis=0)
    q25 = np.percentile(matrix, 25, axis=0)
    iqr = q75 - q25

    informative_mask = iqr > EPSILON
    if not np.any(informative_mask):
        return np.empty((matrix.shape[0], 0), dtype=np.float64), []

    filtered = matrix[:, informative_mask]
    filtered_medians = medians[informative_mask]
    filtered_iqr = iqr[informative_mask]
    filtered_feature_names = [
        name
        for name, keep in zip(feature_names, informative_mask)
        if keep
    ]

    normalized = (filtered - filtered_medians) / filtered_iqr
    return normalized.astype(np.float64, copy=False), filtered_feature_names


def _resolve_feature_group_indices(feature_names: list[str]) -> tuple[list[int], list[int], list[int]]:
    energy_indices: list[int] = []
    spectral_indices: list[int] = []
    rhythmic_indices: list[int] = []

    for index, name in enumerate(feature_names):
        if name in ENERGY_FEATURE_NAMES:
            energy_indices.append(index)
            continue

        if name in RHYTHMIC_FEATURE_NAMES:
            rhythmic_indices.append(index)
            continue

        if name.startswith(SPECTRAL_FEATURE_PREFIXES):
            spectral_indices.append(index)
            continue

    return energy_indices, spectral_indices, rhythmic_indices


def _compute_group_scores(normalized_matrix: np.ndarray, feature_indices: list[int]) -> list[float]:
    if normalized_matrix.shape[0] == 0:
        return []
    if not feature_indices:
        return [0.0] * normalized_matrix.shape[0]

    group_matrix = normalized_matrix[:, feature_indices]
    if group_matrix.ndim != 2 or group_matrix.shape[1] == 0:
        return [0.0] * normalized_matrix.shape[0]

    diffs = np.abs(np.diff(group_matrix, axis=0))
    mean_abs_diffs = np.mean(diffs, axis=1)

    scores = np.zeros(normalized_matrix.shape[0], dtype=np.float64)
    scores[1:] = mean_abs_diffs

    return scores.tolist()


def _combine_component_scores(
    energy_scores: list[float],
    spectral_scores: list[float],
    rhythmic_scores: list[float],
) -> list[float]:
    if not energy_scores or not spectral_scores or not rhythmic_scores:
        return []

    combined: list[float] = []
    for energy, spectral, rhythmic in zip(
        energy_scores,
        spectral_scores,
        rhythmic_scores,
    ):
        value = float(np.mean([energy, spectral, rhythmic]))
        combined.append(float(np.clip(value, 0.0, 1.0)))

    return combined


def _build_per_bar_metrics(
    bars: list[Bar],
    energy_scores: list[float],
    spectral_scores: list[float],
    rhythmic_scores: list[float],
    combined_scores: list[float],
) -> list[ChangeBarMetrics]:
    per_bar: list[ChangeBarMetrics] = []

    for bar, energy, spectral, rhythmic, combined in zip(
        bars,
        energy_scores,
        spectral_scores,
        rhythmic_scores,
        combined_scores,
    ):
        per_bar.append(
            ChangeBarMetrics(
                bar_index=bar.index,
                start_time_sec=float(bar.start),
                end_time_sec=float(bar.end),
                energy_change=float(np.clip(energy, 0.0, 1.0)),
                spectral_change=float(np.clip(spectral, 0.0, 1.0)),
                rhythmic_change=float(np.clip(rhythmic, 0.0, 1.0)),
                combined_change=float(np.clip(combined, 0.0, 1.0)),
            )
        )

    return per_bar


def _compress_scores(per_bar_scores: list[float]) -> list[float]:
    if not per_bar_scores:
        return []

    values = np.asarray(per_bar_scores, dtype=np.float64)
    positive = values[values > 0.0]

    if positive.size == 0:
        return values.tolist()

    scale = float(np.quantile(positive, 0.98))
    if scale <= EPSILON:
        scale = float(np.max(positive))
    if scale <= EPSILON:
        return np.zeros_like(values).tolist()

    scaled = np.clip(values / scale, 0.0, 1.0)
    compressed = np.power(scaled, COMPRESSION_EXPONENT)

    return compressed.tolist()


def _moving_average(values: list[float], window_size: int) -> list[float]:
    if not values:
        return []
    if window_size <= 1:
        return values[:]

    array = np.asarray(values, dtype=np.float64)
    result = np.zeros_like(array)

    half_left = window_size // 2
    half_right = window_size - half_left

    for index in range(len(array)):
        start = max(0, index - half_left)
        end = min(len(array), index + half_right)
        result[index] = np.mean(array[start:end])

    return result.tolist()


def _extract_spans(
    bars: list[Bar],
    curve: list[float],
    mode: str,
    quantile: float,
    min_span_bars: int,
) -> list[Span]:
    if not curve or len(curve) != len(bars):
        return []

    curve_array = np.asarray(curve, dtype=np.float64)
    threshold = float(np.quantile(curve_array, quantile))

    if mode == "low":
        mask = curve_array < threshold
    elif mode == "high":
        mask = curve_array > threshold
    else:
        raise ValueError(f"Unsupported span mode: {mode}")

    spans: list[Span] = []
    start_index: int | None = None

    for index, active in enumerate(mask):
        if active and start_index is None:
            start_index = index
            continue

        if not active and start_index is not None:
            span = _build_span_from_range(bars, curve_array, start_index, index - 1, min_span_bars)
            if span is not None:
                spans.append(span)
            start_index = None

    if start_index is not None:
        span = _build_span_from_range(bars, curve_array, start_index, len(mask) - 1, min_span_bars)
        if span is not None:
            spans.append(span)

    return spans


def _build_span_from_range(
    bars: list[Bar],
    curve_array: np.ndarray,
    start_pos: int,
    end_pos: int,
    min_span_bars: int,
) -> Span | None:
    if end_pos < start_pos:
        return None

    length_bars = end_pos - start_pos + 1
    if length_bars < min_span_bars:
        return None

    start_bar = bars[start_pos]
    end_bar = bars[end_pos]
    score = float(np.mean(curve_array[start_pos : end_pos + 1]))

    return Span(
        start_bar=start_bar.index,
        end_bar=end_bar.index,
        start_time_sec=float(start_bar.start),
        end_time_sec=float(end_bar.end),
        length_bars=length_bars,
        length_sec=float(end_bar.end - start_bar.start),
        score=float(np.clip(score, 0.0, 1.0)),
    )


def _activity_label_from_score(global_score: float) -> str:
    score = float(np.clip(global_score, 0.0, 1.0))

    if score < 0.20:
        return "very_sparse"
    if score < 0.40:
        return "sparse"
    if score < 0.60:
        return "balanced"
    if score < 0.80:
        return "dense"
    return "very_dense"
