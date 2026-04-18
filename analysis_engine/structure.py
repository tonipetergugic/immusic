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


def _build_bars_from_downbeats(downbeats: list[float], duration_sec: float) -> list[dict[str, float | int]]:
    bars: list[dict[str, float | int]] = []

    if len(downbeats) < 2:
        return bars

    for index in range(len(downbeats) - 1):
        start = float(downbeats[index])
        end = float(downbeats[index + 1])
        bars.append(
            {
                "index": index,
                "start": start,
                "end": end,
                "duration_sec": max(0.0, end - start),
            }
        )

    last_start = float(downbeats[-1])
    last_end = float(duration_sec)
    if last_end > last_start:
        bars.append(
            {
                "index": len(bars),
                "start": last_start,
                "end": last_end,
                "duration_sec": max(0.0, last_end - last_start),
            }
        )

    return bars


def analyze_structure_baseline(audio_mono: np.ndarray, sample_rate: int) -> dict[str, Any]:
    duration_sec = float(len(audio_mono) / sample_rate) if sample_rate > 0 else 0.0

    tempo_raw, beat_frames = librosa.beat.beat_track(y=audio_mono, sr=sample_rate)
    tempo = _tempo_to_float(tempo_raw)

    beat_times = librosa.frames_to_time(beat_frames, sr=sample_rate).tolist()
    beat_times = [float(x) for x in beat_times]

    downbeats = beat_times[::4] if beat_times else []
    bars = _build_bars_from_downbeats(downbeats, duration_sec)

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
