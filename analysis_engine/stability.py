from __future__ import annotations

import numpy as np

from schemas import Bar, Span, StabilityMetrics


MIN_STABLE_SEGMENT_BARS = 4
STABLE_LENGTH_REFERENCE_BARS = 16.0
EPSILON = 1e-9


def compute_stability(
    bars: list[Bar],
    smoothed_curve: list[float],
) -> StabilityMetrics:
    if not _has_valid_inputs(bars, smoothed_curve):
        return _empty_stability()

    curve = np.asarray(smoothed_curve, dtype=np.float64)
    threshold = float(np.median(curve))

    stable_mask = curve < threshold
    stable_segments = _extract_stable_segments(
        bars=bars,
        stable_mask=stable_mask,
        curve=curve,
        min_segment_bars=MIN_STABLE_SEGMENT_BARS,
    )

    if not stable_segments:
        return _empty_stability()

    total_bars = len(bars)
    stable_bar_count = int(sum(segment.length_bars for segment in stable_segments))
    stable_coverage_ratio = stable_bar_count / total_bars if total_bars > 0 else 0.0

    average_stable_segment_length = float(
        np.mean([segment.length_bars for segment in stable_segments])
    )
    average_stable_segment_length_ratio = float(
        np.clip(
            average_stable_segment_length / STABLE_LENGTH_REFERENCE_BARS,
            0.0,
            1.0,
        )
    )

    longest_stable_segment = max(stable_segments, key=lambda segment: segment.length_bars)
    longest_stable_segment_ratio = float(
        np.clip(
            longest_stable_segment.length_bars / STABLE_LENGTH_REFERENCE_BARS,
            0.0,
            1.0,
        )
    )

    global_score = float(
        np.clip(
            (0.4 * stable_coverage_ratio)
            + (0.4 * longest_stable_segment_ratio)
            + (0.2 * average_stable_segment_length_ratio),
            0.0,
            1.0,
        )
    )
    stability_label = _stability_label_from_score(global_score)

    return StabilityMetrics(
        global_score=global_score,
        stability_label=stability_label,
        stable_segments=stable_segments,
        longest_stable_segment=longest_stable_segment,
        average_stable_segment_length=average_stable_segment_length,
    )


def _empty_stability() -> StabilityMetrics:
    return StabilityMetrics(
        global_score=0.0,
        stability_label="very_fragmented",
        stable_segments=[],
        longest_stable_segment=None,
        average_stable_segment_length=0.0,
    )


def _has_valid_inputs(bars: list[Bar], smoothed_curve: list[float]) -> bool:
    if not bars or not smoothed_curve:
        return False
    if len(bars) != len(smoothed_curve):
        return False
    if len(bars) < 2:
        return False
    return True


def _extract_stable_segments(
    bars: list[Bar],
    stable_mask: np.ndarray,
    curve: np.ndarray,
    min_segment_bars: int,
) -> list[Span]:
    segments: list[Span] = []
    start_index: int | None = None

    for index, is_stable in enumerate(stable_mask):
        if is_stable and start_index is None:
            start_index = index
            continue

        if not is_stable and start_index is not None:
            segment = _build_segment(
                bars=bars,
                curve=curve,
                start_pos=start_index,
                end_pos=index - 1,
                min_segment_bars=min_segment_bars,
            )
            if segment is not None:
                segments.append(segment)
            start_index = None

    if start_index is not None:
        segment = _build_segment(
            bars=bars,
            curve=curve,
            start_pos=start_index,
            end_pos=len(stable_mask) - 1,
            min_segment_bars=min_segment_bars,
        )
        if segment is not None:
            segments.append(segment)

    return segments


def _build_segment(
    bars: list[Bar],
    curve: np.ndarray,
    start_pos: int,
    end_pos: int,
    min_segment_bars: int,
) -> Span | None:
    if end_pos < start_pos:
        return None

    length_bars = end_pos - start_pos + 1
    if length_bars < min_segment_bars:
        return None

    start_bar = bars[start_pos]
    end_bar = bars[end_pos]
    segment_curve = curve[start_pos : end_pos + 1]

    mean_curve_value = float(np.mean(segment_curve)) if segment_curve.size > 0 else 0.0
    stability_score = float(np.clip(1.0 - mean_curve_value, 0.0, 1.0))

    return Span(
        start_bar=start_bar.index,
        end_bar=end_bar.index,
        start_time_sec=float(start_bar.start),
        end_time_sec=float(end_bar.end),
        length_bars=length_bars,
        length_sec=float(end_bar.end - start_bar.start),
        score=stability_score,
    )


def _stability_label_from_score(global_score: float) -> str:
    score = float(np.clip(global_score, 0.0, 1.0))

    if score < 0.20:
        return "very_fragmented"
    if score < 0.40:
        return "fragmented"
    if score < 0.60:
        return "balanced"
    if score < 0.80:
        return "stable"
    return "very_stable"
