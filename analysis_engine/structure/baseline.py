from __future__ import annotations

from typing import Any

import librosa
import numpy as np


def _tempo_to_float(value: Any) -> float:
    if isinstance(value, np.ndarray):
        if value.size == 0:
            return 0.0
        return float(value.reshape(-1)[0])
    if isinstance(value, (list, tuple)):
        if not value:
            return 0.0
        return float(value[0])
    return float(value)


def _estimate_last_bar_end(beat_times: list[float], start_index: int) -> float:
    local_slice = np.asarray(beat_times[start_index : start_index + 4], dtype=float)
    local_intervals = np.diff(local_slice)

    if local_intervals.size > 0:
        beat_interval = float(np.median(local_intervals))
    else:
        all_intervals = np.diff(np.asarray(beat_times, dtype=float))
        beat_interval = float(np.median(all_intervals)) if all_intervals.size > 0 else 0.0

    return float(beat_times[-1] + max(0.0, beat_interval))


def _build_full_bars_from_beats(beat_times: list[float]) -> list[dict[str, float | int]]:
    bars: list[dict[str, float | int]] = []

    # Assumes a 4/4 time signature.
    # This is sufficient for the current EDM / techno-focused use case.
    full_bar_count = len(beat_times) // 4
    if full_bar_count == 0:
        return bars

    for bar_index in range(full_bar_count):
        start_index = bar_index * 4
        start = float(beat_times[start_index])

        next_bar_start_index = start_index + 4
        if next_bar_start_index < len(beat_times):
            end = float(beat_times[next_bar_start_index])
        else:
            end = _estimate_last_bar_end(beat_times, start_index)

        bars.append(
            {
                "index": bar_index,
                "start": start,
                "end": end,
                "duration_sec": max(0.0, end - start),
            }
        )

    return bars


def analyze_structure_baseline(audio_mono: np.ndarray, sample_rate: int) -> dict[str, Any]:
    tempo_raw, beat_frames = librosa.beat.beat_track(y=audio_mono, sr=sample_rate)
    tempo = _tempo_to_float(tempo_raw)

    beat_times = librosa.frames_to_time(beat_frames, sr=sample_rate).tolist()
    beat_times = [float(x) for x in beat_times]

    bars = _build_full_bars_from_beats(beat_times)
    downbeats = [float(bar["start"]) for bar in bars]

    bar_durations = [float(bar["duration_sec"]) for bar in bars]
    median_bar_duration = float(np.median(bar_durations)) if bar_durations else 0.0
    last_bar_duration = float(bar_durations[-1]) if bar_durations else 0.0

    return {
        "tempo_estimate": tempo,
        "beat_count": len(beat_times),
        "downbeat_count": len(downbeats),
        "bar_count": len(bars),
        "beats": beat_times,
        "downbeats": downbeats,
        "bars": bars,
        "median_bar_duration": median_bar_duration,
        "last_bar_duration": last_bar_duration,
    }
