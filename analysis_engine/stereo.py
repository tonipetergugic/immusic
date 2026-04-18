from __future__ import annotations

import math

import numpy as np


def _safe_rms(audio: np.ndarray) -> float:
    if audio.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))


def _safe_db(value: float) -> float:
    if value <= 0.0:
        return float("-inf")
    return 20.0 * math.log10(value)


def _safe_corrcoef(left: np.ndarray, right: np.ndarray) -> float:
    if left.size == 0 or right.size == 0:
        return 0.0

    left_std = float(np.std(left))
    right_std = float(np.std(right))
    if left_std == 0.0 or right_std == 0.0:
        return 0.0

    corr = np.corrcoef(left, right)[0, 1]
    if np.isnan(corr):
        return 0.0
    return float(corr)


def analyze_stereo(audio_stereo: np.ndarray, sample_rate: int) -> dict[str, float | int]:
    audio = np.asarray(audio_stereo, dtype=np.float32)

    if audio.ndim != 2 or audio.shape[0] != 2:
        raise ValueError("analyze_stereo expects stereo audio with shape (2, samples)")

    left = audio[0]
    right = audio[1]

    mid = (left + right) * 0.5
    side = (left - right) * 0.5

    left_rms = _safe_rms(left)
    right_rms = _safe_rms(right)
    mid_rms = _safe_rms(mid)
    side_rms = _safe_rms(side)

    side_mid_ratio = 0.0
    if mid_rms > 0.0:
        side_mid_ratio = float(side_rms / mid_rms)

    return {
        "sample_rate": int(sample_rate),
        "left_rms": left_rms,
        "right_rms": right_rms,
        "mid_rms": mid_rms,
        "side_rms": side_rms,
        "left_rms_dbfs": _safe_db(left_rms),
        "right_rms_dbfs": _safe_db(right_rms),
        "mid_rms_dbfs": _safe_db(mid_rms),
        "side_rms_dbfs": _safe_db(side_rms),
        "side_mid_ratio": side_mid_ratio,
        "correlation": _safe_corrcoef(left, right),
    }
