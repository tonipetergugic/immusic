from __future__ import annotations

import math

import librosa
import numpy as np

from analysis_engine.schemas import (
    TransientTimelineItem,
    TransientsBasis,
    TransientsMetrics,
)


FRAME_LENGTH = 2048
HOP_LENGTH = 512
WINDOW_SEC = 10.0
WINDOW_HOP_SEC = 10.0
PEAK_PICK_DELTA = 0.08
EPSILON = 1e-12


def _to_mono(audio_signal: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio_signal, dtype=np.float32)

    if audio.size == 0:
        return np.zeros(0, dtype=np.float32)

    if audio.ndim == 1:
        return audio.astype(np.float32, copy=False)

    if audio.ndim != 2:
        return np.zeros(0, dtype=np.float32)

    if audio.shape[0] <= 8 and audio.shape[1] > audio.shape[0]:
        return np.mean(audio, axis=0).astype(np.float32, copy=False)

    return np.mean(audio, axis=1).astype(np.float32, copy=False)


def _short_crest_series(
    mono: np.ndarray,
    sample_rate: int,
) -> tuple[np.ndarray, np.ndarray]:
    if mono.size < FRAME_LENGTH or sample_rate <= 0:
        return np.zeros(0, dtype=np.float64), np.zeros(0, dtype=np.float64)

    times: list[float] = []
    crest_values: list[float] = []

    for start in range(0, mono.size - FRAME_LENGTH + 1, HOP_LENGTH):
        frame = mono[start : start + FRAME_LENGTH].astype(np.float64, copy=False)

        peak = float(np.max(np.abs(frame)))
        rms = float(np.sqrt(np.mean(np.square(frame, dtype=np.float64))))

        if peak <= EPSILON or rms <= EPSILON:
            continue

        crest_db = float(20.0 * math.log10(peak / rms))
        if math.isfinite(crest_db):
            center_sample = start + FRAME_LENGTH / 2.0
            times.append(float(center_sample / sample_rate))
            crest_values.append(crest_db)

    return np.asarray(times, dtype=np.float64), np.asarray(crest_values, dtype=np.float64)


def _onset_times_and_attack_strength(
    mono: np.ndarray,
    sample_rate: int,
) -> tuple[np.ndarray, float | None]:
    if mono.size == 0 or sample_rate <= 0:
        return np.zeros(0, dtype=np.float64), None

    try:
        onset_env = librosa.onset.onset_strength(
            y=mono,
            sr=sample_rate,
            hop_length=HOP_LENGTH,
        )
    except Exception:
        return np.zeros(0, dtype=np.float64), None

    if onset_env.size == 0:
        return np.zeros(0, dtype=np.float64), None

    onset_env = np.asarray(onset_env, dtype=np.float64)
    finite_env = onset_env[np.isfinite(onset_env)]

    if finite_env.size == 0:
        return np.zeros(0, dtype=np.float64), None

    max_env = float(np.max(finite_env))
    if max_env <= EPSILON:
        attack_strength = None
    else:
        p95_env = float(np.percentile(finite_env, 95))
        attack_strength = float(max(0.0, min(1.0, p95_env / max_env)))

    try:
        onset_times = librosa.onset.onset_detect(
            onset_envelope=onset_env,
            sr=sample_rate,
            hop_length=HOP_LENGTH,
            units="time",
            delta=PEAK_PICK_DELTA,
            wait=1,
        )
    except Exception:
        onset_times = np.zeros(0, dtype=np.float64)

    return np.asarray(onset_times, dtype=np.float64), attack_strength


def _safe_mean(values: np.ndarray) -> float | None:
    if values.size == 0:
        return None

    value = float(np.mean(values))
    return value if math.isfinite(value) else None


def _safe_p95(values: np.ndarray) -> float | None:
    if values.size == 0:
        return None

    value = float(np.percentile(values, 95))
    return value if math.isfinite(value) else None


def _build_timeline(
    duration_sec: float,
    onset_times: np.ndarray,
    crest_times: np.ndarray,
    crest_values: np.ndarray,
) -> list[TransientTimelineItem]:
    if duration_sec <= 0:
        return []

    timeline: list[TransientTimelineItem] = []
    start_sec = 0.0

    while start_sec < duration_sec:
        end_sec = min(duration_sec, start_sec + WINDOW_SEC)
        window_duration = max(EPSILON, end_sec - start_sec)

        onset_mask = (onset_times >= start_sec) & (onset_times < end_sec)
        transient_count = int(np.count_nonzero(onset_mask))
        density_per_sec = float(transient_count / window_duration)

        crest_mask = (crest_times >= start_sec) & (crest_times < end_sec)
        window_crests = crest_values[crest_mask]

        timeline.append(
            TransientTimelineItem(
                start_sec=float(start_sec),
                end_sec=float(end_sec),
                transient_count=transient_count,
                density_per_sec=density_per_sec,
                mean_short_crest_db=_safe_mean(window_crests),
                p95_short_crest_db=_safe_p95(window_crests),
            )
        )

        start_sec += WINDOW_HOP_SEC

    return timeline


def _density_cv(timeline: list[TransientTimelineItem]) -> float | None:
    densities = np.asarray(
        [item.density_per_sec for item in timeline if math.isfinite(item.density_per_sec)],
        dtype=np.float64,
    )

    if densities.size < 2:
        return None

    mean_density = float(np.mean(densities))
    if mean_density <= EPSILON:
        return None

    return float(np.std(densities) / mean_density)


def analyze_transients(audio_signal: np.ndarray, sample_rate: int) -> TransientsMetrics:
    if sample_rate <= 0:
        return TransientsMetrics(status="not_available", basis=TransientsBasis())

    mono = _to_mono(audio_signal)

    if mono.size == 0:
        return TransientsMetrics(status="not_available", basis=TransientsBasis())

    duration_sec = float(mono.size / sample_rate)

    onset_times, attack_strength = _onset_times_and_attack_strength(mono, sample_rate)
    crest_times, crest_values = _short_crest_series(mono, sample_rate)

    transient_density_per_sec = (
        float(onset_times.size / duration_sec) if duration_sec > 0 else None
    )

    timeline = _build_timeline(
        duration_sec=duration_sec,
        onset_times=onset_times,
        crest_times=crest_times,
        crest_values=crest_values,
    )

    has_data = onset_times.size > 0 or crest_values.size > 0

    if not has_data:
        return TransientsMetrics(
            status="not_available",
            basis=TransientsBasis(
                method="onset_envelope_short_crest",
                window_sec=WINDOW_SEC,
                hop_sec=WINDOW_HOP_SEC,
                peak_pick_delta=PEAK_PICK_DELTA,
            ),
        )

    return TransientsMetrics(
        status="available",
        attack_strength=attack_strength,
        transient_density_per_sec=transient_density_per_sec,
        mean_short_crest_db=_safe_mean(crest_values),
        p95_short_crest_db=_safe_p95(crest_values),
        transient_density_cv=_density_cv(timeline),
        timeline=timeline,
        basis=TransientsBasis(
            method="onset_envelope_short_crest",
            window_sec=WINDOW_SEC,
            hop_sec=WINDOW_HOP_SEC,
            peak_pick_delta=PEAK_PICK_DELTA,
        ),
    )
