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


def _estimate_tempo_from_beats(beat_times: np.ndarray) -> float:
    if beat_times.size < 2:
        return 0.0

    intervals = np.diff(beat_times)
    positive_intervals = intervals[intervals > 0]
    if positive_intervals.size == 0:
        return 0.0

    return float(60.0 / np.median(positive_intervals))


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

    median_bar_duration = float(np.median(np.diff(downbeats)))
    bars: list[Bar] = []

    for index, start in enumerate(downbeats):
        start_value = float(start)

        if index + 1 < len(downbeats):
            end_value = float(downbeats[index + 1])
        else:
            end_value = min(track_duration, start_value + median_bar_duration)

        if end_value > start_value:
            bars.append(Bar(index=len(bars), start=start_value, end=end_value))

    if len(bars) < 2:
        raise ValueError("Too few bars derived. Bar grid is not reliable enough to continue.")

    return BeatGridResult(
        tempo_estimate=_estimate_tempo_from_beats(beat_times),
        beats=[float(value) for value in beat_times.tolist()],
        downbeats=[float(value) for value in downbeats.tolist()],
        bars=bars,
    )
