from __future__ import annotations

import math

import numpy as np

from analysis_engine.schemas import (
    LimiterStressBasis,
    LimiterStressMetrics,
    LimiterStressTimelineItem,
)


WINDOW_SEC = 10.0
EVENT_FRAME_SEC = 0.1
STRESS_THRESHOLD_DBTP = -1.0
CRITICAL_THRESHOLD_DBTP = -0.2
HIGH_EVENT_COUNT_PER_10S = 25


def _channels_first(audio_signal: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio_signal, dtype=np.float32)

    if audio.size == 0:
        return np.zeros((0, 0), dtype=np.float32)

    if audio.ndim == 1:
        return audio.reshape(1, -1)

    if audio.ndim != 2:
        return np.zeros((0, 0), dtype=np.float32)

    if audio.shape[0] <= 8 and audio.shape[1] > audio.shape[0]:
        return audio.astype(np.float32, copy=False)

    if audio.shape[1] <= 8 and audio.shape[0] > audio.shape[1]:
        return np.transpose(audio).astype(np.float32, copy=False)

    return audio.astype(np.float32, copy=False)


def _peak_db(value: np.ndarray) -> float | None:
    if value.size == 0:
        return None

    peak = float(np.max(np.abs(value)))
    if peak <= 0.0 or not math.isfinite(peak):
        return None

    return float(20.0 * math.log10(peak))


def _count_stress_events(window_audio: np.ndarray, sample_rate: int) -> int:
    frame_size = max(1, int(round(EVENT_FRAME_SEC * float(sample_rate))))
    sample_count = int(window_audio.shape[1])
    count = 0

    for frame_start in range(0, sample_count, frame_size):
        frame_end = min(frame_start + frame_size, sample_count)
        frame_peak_db = _peak_db(window_audio[:, frame_start:frame_end])
        if frame_peak_db is not None and frame_peak_db >= STRESS_THRESHOLD_DBTP:
            count += 1

    return count


def _risk_for_window(stress_event_count: int, max_peak_dbtp: float | None) -> str:
    if max_peak_dbtp is not None and max_peak_dbtp >= CRITICAL_THRESHOLD_DBTP:
        return "high"

    if stress_event_count >= HIGH_EVENT_COUNT_PER_10S:
        return "high"

    if stress_event_count > 0:
        return "medium"

    return "low"


def _not_available() -> LimiterStressMetrics:
    return LimiterStressMetrics(
        status="not_available",
        events_per_min=None,
        max_events_per_10s=None,
        p95_events_per_10s=None,
        timeline=[],
        basis=LimiterStressBasis(),
    )


def analyze_limiter_stress(audio_signal: np.ndarray, sample_rate: int) -> LimiterStressMetrics:
    if sample_rate <= 0:
        return _not_available()

    audio = _channels_first(audio_signal)
    if audio.size == 0 or audio.ndim != 2 or audio.shape[1] == 0:
        return _not_available()

    total_samples = int(audio.shape[1])
    duration_sec = total_samples / float(sample_rate)
    if duration_sec <= 0.0:
        return _not_available()

    window_size = max(1, int(round(WINDOW_SEC * float(sample_rate))))
    timeline: list[LimiterStressTimelineItem] = []

    for window_start in range(0, total_samples, window_size):
        window_end = min(window_start + window_size, total_samples)
        if window_end <= window_start:
            continue

        window_audio = audio[:, window_start:window_end]
        stress_event_count = _count_stress_events(window_audio, sample_rate)
        max_peak_dbtp = _peak_db(window_audio)

        timeline.append(
            LimiterStressTimelineItem(
                start_sec=float(window_start / float(sample_rate)),
                end_sec=float(window_end / float(sample_rate)),
                stress_event_count=int(stress_event_count),
                max_peak_dbtp=max_peak_dbtp,
                risk=_risk_for_window(stress_event_count, max_peak_dbtp),
            )
        )

    if not timeline:
        return _not_available()

    event_counts = np.asarray([item.stress_event_count for item in timeline], dtype=np.float64)
    total_event_count = int(np.sum(event_counts))

    return LimiterStressMetrics(
        status="available",
        events_per_min=float(total_event_count / duration_sec * 60.0),
        max_events_per_10s=int(np.max(event_counts)),
        p95_events_per_10s=int(round(float(np.percentile(event_counts, 95)))),
        timeline=timeline,
        basis=LimiterStressBasis(
            window_sec=WINDOW_SEC,
            event_frame_sec=EVENT_FRAME_SEC,
            stress_threshold_dbtp=STRESS_THRESHOLD_DBTP,
            critical_threshold_dbtp=CRITICAL_THRESHOLD_DBTP,
            peak_method="sample_peak_dbfs_per_100ms_frame",
        ),
    )
