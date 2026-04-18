from __future__ import annotations

import math

import numpy as np
import pyloudnorm as pyln


def _to_float(value: float | int | np.floating) -> float:
    return float(value)


def _safe_peak_dbfs(audio: np.ndarray) -> float:
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak <= 0.0:
        return float("-inf")
    return 20.0 * math.log10(peak)


def _safe_rms_dbfs(audio: np.ndarray) -> float:
    if audio.size == 0:
        return float("-inf")

    rms = float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))
    if rms <= 0.0:
        return float("-inf")
    return 20.0 * math.log10(rms)


def analyze_loudness(
    audio_mono: np.ndarray,
    sample_rate: int,
) -> dict[str, float | int | None]:
    audio = np.asarray(audio_mono, dtype=np.float32)

    if audio.ndim != 1:
        raise ValueError("analyze_loudness expects mono audio with shape (samples,)")

    meter = pyln.Meter(sample_rate)

    integrated_lufs = _to_float(meter.integrated_loudness(audio))
    peak_dbfs = _safe_peak_dbfs(audio)
    rms_dbfs = _safe_rms_dbfs(audio)

    loudness_range_lu: float | None = None
    try:
        loudness_range_lu = _to_float(meter.loudness_range(audio))
    except Exception:
        loudness_range_lu = None

    return {
        "sample_rate": int(sample_rate),
        "integrated_lufs": integrated_lufs,
        "loudness_range_lu": loudness_range_lu,
        "peak_dbfs": peak_dbfs,
        "rms_dbfs": rms_dbfs,
    }
