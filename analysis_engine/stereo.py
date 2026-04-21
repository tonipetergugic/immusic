from __future__ import annotations

import numpy as np

from analysis_engine.schemas import StereoMetrics


def _safe_rms(audio: np.ndarray) -> float:
    if audio.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))


def _phase_correlation(left: np.ndarray, right: np.ndarray) -> float:
    """Phase correlation in the range -1 to +1."""
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
) -> StereoMetrics:
    """
    Stereo measurement block.
    Returns only the minimal contract for phase and width analysis.
    """
    if audio_stereo.ndim != 2 or audio_stereo.shape[0] != 2:
        raise ValueError("analyze_stereo expects stereo audio with shape (2, samples)")

    left = audio_stereo[0].astype(np.float32)
    right = audio_stereo[1].astype(np.float32)

    # Mid / Side (power-preserving)
    mid = (left + right) / np.sqrt(2.0)
    side = (left - right) / np.sqrt(2.0)

    mid_rms = _safe_rms(mid)
    side_rms = _safe_rms(side)

    # Phase Correlation
    phase_correlation = _phase_correlation(left, right)

    # Stereo width proxy based on side vs. total mid+side energy.
    total_energy = mid_rms + side_rms
    stereo_width = side_rms / total_energy if total_energy > 0 else 0.0

    # Side-to-mid energy ratio.
    side_mid_ratio = side_rms / mid_rms if mid_rms > 0 else 0.0

    return StereoMetrics(
        sample_rate=int(sample_rate),
        side_mid_ratio=side_mid_ratio,
        phase_correlation=phase_correlation,
        stereo_width=stereo_width,
    )
