from __future__ import annotations

from dataclasses import dataclass

from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
import numpy as np

from schemas import Bar


@dataclass
class BeatGridResult:
    tempo_estimate: float
    beats: list[float]
    downbeats: list[float]
    bars: list[Bar]
    bar_durations: list[float]
    median_bar_duration: float
    last_bar_duration: float
    last_4_bar_durations: list[float]
    last_8_bar_durations: list[float]
    uncovered_tail_sec: float


def _estimate_tempo_from_beats(beat_times: np.ndarray) -> float:
    if beat_times.size < 2:
        return 0.0

    intervals = np.diff(beat_times)
    positive_intervals = intervals[intervals > 0]
    if positive_intervals.size == 0:
        return 0.0

    return float(60.0 / np.median(positive_intervals))


def _validate_bar_grid_quality(bars: list[Bar], track_duration: float) -> None:
    if len(bars) < 8:
        raise ValueError("Too few bars derived. Bar grid is not reliable enough to continue.")

    bar_durations = np.asarray([bar.end - bar.start for bar in bars], dtype=float)

    if bar_durations.size == 0:
        raise ValueError("No bar durations available. Bar grid is not reliable enough to continue.")

    if np.any(bar_durations <= 0):
        raise ValueError("Non-positive bar duration detected. Bar grid is not reliable enough to continue.")

    median_bar_duration = float(np.median(bar_durations))
    if median_bar_duration <= 0:
        raise ValueError("Median bar duration is invalid. Bar grid is not reliable enough to continue.")

    relative_deviation = np.abs(bar_durations - median_bar_duration) / median_bar_duration

    unstable_ratio = float(np.mean(relative_deviation > 0.12))
    if unstable_ratio > 0.08:
        raise ValueError(
            f"Bar grid is too unstable overall (unstable_ratio={unstable_ratio:.3f})."
        )

    recent_window = bar_durations[-8:] if bar_durations.size >= 8 else bar_durations
    recent_relative_deviation = np.abs(recent_window - median_bar_duration) / median_bar_duration

    if np.any(recent_relative_deviation > 0.18):
        raise ValueError("Recent bars are too unstable. Bar grid is not reliable enough to continue.")

    coverage_end = float(bars[-1].end)
    if coverage_end <= 0:
        raise ValueError("Bar coverage end is invalid. Bar grid is not reliable enough to continue.")

    uncovered_tail = max(0.0, float(track_duration) - coverage_end)
    if uncovered_tail > (median_bar_duration * 8.0):
        raise ValueError(
            f"Too much uncovered tail remains after last bar ({uncovered_tail:.2f}s)."
        )


def _relative_deviation(value: float, reference: float) -> float:
    if reference <= 0:
        return 0.0
    return abs(value - reference) / reference


def _trim_unreliable_tail_downbeats(
    downbeats: np.ndarray,
    *,
    tolerance_ratio: float = 0.12,
    min_reference_intervals: int = 16,
) -> np.ndarray:
    if downbeats.size < (min_reference_intervals + 3):
        return downbeats

    intervals = np.diff(downbeats)
    positive_intervals = intervals[intervals > 0]

    if positive_intervals.size < min_reference_intervals:
        return downbeats

    reference_intervals = positive_intervals[:min_reference_intervals]
    reference_median = float(np.median(reference_intervals))

    trim_index = len(downbeats)

    for interval_index in range(len(intervals) - 1, min_reference_intervals - 1, -1):
        interval_value = float(intervals[interval_index])

        if interval_value <= 0:
            trim_index = interval_index + 1
            continue

        deviation = _relative_deviation(interval_value, reference_median)

        if deviation > tolerance_ratio:
            trim_index = interval_index + 1
            continue

        break

    trimmed = downbeats[:trim_index]

    if trimmed.size < 2:
        return downbeats

    return trimmed


def _reference_bar_duration(downbeats: np.ndarray) -> float:
    if downbeats.size < 2:
        return 0.0

    intervals = np.diff(downbeats)
    positive_intervals = intervals[intervals > 0]

    if positive_intervals.size == 0:
        return 0.0

    return float(np.median(positive_intervals))


def build_beat_grid(audio_path: str, track_duration: float) -> BeatGridResult:
    activations = RNNDownBeatProcessor()(audio_path)
    tracking = DBNDownBeatTrackingProcessor(beats_per_bar=[4], fps=100)
    result = np.asarray(tracking(activations), dtype=float)

    if result.size == 0 or result.shape[0] < 8:
        raise ValueError("Too few beat events detected. Bar grid is not reliable enough to continue.")

    beat_times = result[:, 0]
    beat_numbers = result[:, 1].astype(int)
    downbeats = beat_times[beat_numbers == 1]

    if downbeats.size < 2:
        raise ValueError("Too few downbeats detected. Bar grid is not reliable enough to continue.")

    downbeats = _trim_unreliable_tail_downbeats(downbeats)

    if downbeats.size < 2:
        raise ValueError("Too few reliable downbeats remain after tail trimming.")

    reference_bar_duration = _reference_bar_duration(downbeats)
    if reference_bar_duration <= 0:
        raise ValueError("Could not derive a stable bar duration from downbeats.")

    bars: list[Bar] = []

    for index, start in enumerate(downbeats):
        start_value = float(start)

        if index + 1 < len(downbeats):
            end_value = float(downbeats[index + 1])
        else:
            end_value = min(track_duration, start_value + reference_bar_duration)

        if end_value > start_value:
            bars.append(Bar(index=len(bars), start=start_value, end=end_value))

    _validate_bar_grid_quality(bars, track_duration)

    bar_durations = [float(bar.end - bar.start) for bar in bars]
    median_bar_duration = float(np.median(bar_durations)) if bar_durations else 0.0
    last_bar_duration = bar_durations[-1] if bar_durations else 0.0
    last_4_bar_durations = bar_durations[-4:]
    last_8_bar_durations = bar_durations[-8:]
    uncovered_tail_sec = max(0.0, track_duration - bars[-1].end) if bars else track_duration

    return BeatGridResult(
        tempo_estimate=_estimate_tempo_from_beats(beat_times),
        beats=[float(value) for value in beat_times.tolist()],
        downbeats=[float(value) for value in downbeats.tolist()],
        bars=bars,
        bar_durations=bar_durations,
        median_bar_duration=median_bar_duration,
        last_bar_duration=last_bar_duration,
        last_4_bar_durations=last_4_bar_durations,
        last_8_bar_durations=last_8_bar_durations,
        uncovered_tail_sec=float(uncovered_tail_sec),
    )
