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


def _phase_correlation(left: np.ndarray, right: np.ndarray) -> float:
    """Phase Correlation (-1 bis +1). Dashboard zeigt diesen Wert direkt."""
    if left.size == 0 or right.size == 0:
        return 0.0
    # Mittelwert entfernen (DC-Offset)
    left = left - np.mean(left)
    right = right - np.mean(right)
    numerator = np.sum(left * right)
    denominator = np.sqrt(np.sum(left**2) * np.sum(right**2))
    if denominator == 0:
        return 0.0
    return float(numerator / denominator)


def analyze_stereo(
    audio_stereo: np.ndarray,
    sample_rate: int,
) -> dict[str, float | int]:
    """
    Erweiterte Stereo-Analyse für das Dashboard.
    Liefert: Stereo Width, Phase Correlation, Mid/Side Energy.
    """
    if audio_stereo.ndim != 2 or audio_stereo.shape[0] != 2:
        raise ValueError("analyze_stereo expects stereo audio with shape (2, samples)")

    left = audio_stereo[0].astype(np.float32)
    right = audio_stereo[1].astype(np.float32)

    # RMS Werte
    left_rms = _safe_rms(left)
    right_rms = _safe_rms(right)

    # Mid / Side (power-preserving)
    mid = (left + right) / np.sqrt(2.0)
    side = (left - right) / np.sqrt(2.0)

    mid_rms = _safe_rms(mid)
    side_rms = _safe_rms(side)

    # dBFS
    left_rms_dbfs = _safe_db(left_rms)
    right_rms_dbfs = _safe_db(right_rms)
    mid_rms_dbfs = _safe_db(mid_rms)
    side_rms_dbfs = _safe_db(side_rms)

    # Phase Correlation
    phase_correlation = _phase_correlation(left, right)

    # Stereo Width (0.0 = mono, 1.0 = voll stereo) – passt zum Dashboard-Wert 0.23
    total_energy = mid_rms + side_rms
    stereo_width = side_rms / total_energy if total_energy > 0 else 0.0

    # Side/Mid Ratio (oft als zusätzliche Info nützlich)
    side_mid_ratio = side_rms / mid_rms if mid_rms > 0 else 0.0

    return {
        "sample_rate": int(sample_rate),
        "left_rms": float(left_rms),
        "right_rms": float(right_rms),
        "mid_rms": float(mid_rms),
        "side_rms": float(side_rms),
        "left_rms_dbfs": left_rms_dbfs,
        "right_rms_dbfs": right_rms_dbfs,
        "mid_rms_dbfs": mid_rms_dbfs,
        "side_rms_dbfs": side_rms_dbfs,
        "side_mid_ratio": float(side_mid_ratio),
        "phase_correlation": phase_correlation,
        "stereo_width": float(stereo_width),
        "stereo_width_percent": float(stereo_width * 100),
    }
