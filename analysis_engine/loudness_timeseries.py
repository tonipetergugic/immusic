from __future__ import annotations

import math

import numpy as np
import pyloudnorm as pyln

from analysis_engine.schemas import (
    ShortTermLufsPoint,
    ShortTermLufsSeries,
    ShortTermLufsSummary,
)


WINDOW_SEC = 3.0
HOP_SEC = 1.0


def _prepare_audio(audio_signal: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio_signal, dtype=np.float32)

    if audio.size == 0:
        return np.zeros((0, 0), dtype=np.float32)

    if audio.ndim == 1:
        return audio.astype(np.float32, copy=False)

    if audio.ndim != 2:
        return np.zeros((0, 0), dtype=np.float32)

    if audio.shape[0] <= 8 and audio.shape[1] > audio.shape[0]:
        return np.transpose(audio).astype(np.float32, copy=False)

    return audio.astype(np.float32, copy=False)


def _safe_loudness(meter: pyln.Meter, audio_window: np.ndarray) -> float | None:
    if audio_window.size == 0:
        return None

    try:
        value = float(meter.integrated_loudness(audio_window))
    except Exception:
        return None

    if not math.isfinite(value):
        return None

    return value


def _summary_from_values(values: list[float]) -> ShortTermLufsSummary:
    if not values:
        return ShortTermLufsSummary()

    array = np.asarray(values, dtype=np.float64)

    p10 = float(np.percentile(array, 10))
    p90 = float(np.percentile(array, 90))

    return ShortTermLufsSummary(
        min_lufs_s=float(np.min(array)),
        max_lufs_s=float(np.max(array)),
        avg_lufs_s=float(np.mean(array)),
        p10_lufs_s=p10,
        p90_lufs_s=p90,
        dynamic_range_lu=float(p90 - p10),
    )


def analyze_short_term_lufs_series(
    audio_signal: np.ndarray,
    sample_rate: int,
) -> ShortTermLufsSeries:
    if sample_rate <= 0:
        return ShortTermLufsSeries(
            status="not_available",
            window_sec=WINDOW_SEC,
            hop_sec=HOP_SEC,
        )

    audio = _prepare_audio(audio_signal)

    if audio.size == 0 or audio.ndim not in (1, 2):
        return ShortTermLufsSeries(
            status="not_available",
            window_sec=WINDOW_SEC,
            hop_sec=HOP_SEC,
        )

    sample_count = int(audio.shape[0])
    duration_sec = sample_count / float(sample_rate)

    if duration_sec < WINDOW_SEC:
        return ShortTermLufsSeries(
            status="not_available",
            window_sec=WINDOW_SEC,
            hop_sec=HOP_SEC,
        )

    window_size = max(1, int(round(WINDOW_SEC * float(sample_rate))))
    hop_size = max(1, int(round(HOP_SEC * float(sample_rate))))
    meter = pyln.Meter(sample_rate)

    points: list[ShortTermLufsPoint] = []
    valid_values: list[float] = []

    last_start = sample_count - window_size

    for start in range(0, last_start + 1, hop_size):
        end = start + window_size
        window_audio = audio[start:end]

        value = _safe_loudness(meter, window_audio)
        center_time = (start + (window_size / 2.0)) / float(sample_rate)

        points.append(
            ShortTermLufsPoint(
                t=float(center_time),
                lufs_s=value,
            )
        )

        if value is not None:
            valid_values.append(value)

    if not points or not valid_values:
        return ShortTermLufsSeries(
            status="not_available",
            window_sec=WINDOW_SEC,
            hop_sec=HOP_SEC,
            points=points,
            summary=ShortTermLufsSummary(),
        )

    return ShortTermLufsSeries(
        status="available",
        window_sec=WINDOW_SEC,
        hop_sec=HOP_SEC,
        points=points,
        summary=_summary_from_values(valid_values),
    )
