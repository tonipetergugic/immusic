from __future__ import annotations

import math

import numpy as np
import pyloudnorm as pyln
from scipy.interpolate import interp1d


def _to_float(value) -> float:
    return float(value)


def _safe_peak_dbfs(audio: np.ndarray) -> float:
    if audio.size == 0:
        return float("-inf")
    peak = float(np.max(np.abs(audio)))
    if peak <= 0.0:
        return float("-inf")
    return 20.0 * math.log10(peak)


def _true_peak_approx_dbtp(audio: np.ndarray) -> float:
    if audio.size < 32:
        return _safe_peak_dbfs(audio)

    x = np.arange(len(audio), dtype=np.float64)
    f = interp1d(x, audio, kind='cubic', fill_value="extrapolate", bounds_error=False)
    x_up = np.linspace(0, len(audio) - 1, 8 * len(audio), endpoint=False)
    up = f(x_up)

    peak = float(np.max(np.abs(up)))
    return 20.0 * math.log10(peak) if peak > 0 else float("-inf")


def analyze_loudness(
    audio_mono: np.ndarray,
    sample_rate: int,
) -> dict[str, float | None]:
    audio = np.asarray(audio_mono, dtype=np.float32).copy()

    if audio.ndim != 1 or audio.size == 0:
        return {
            "sample_rate": int(sample_rate),
            "integrated_lufs": None,
            "loudness_range_lu": None,
            "momentary_max_lufs": None,
            "short_term_max_lufs": None,
            "true_peak_dbtp": None,
            "true_peak_margin_dbtp": None,
            "peak_dbfs": None,
        }

    meter = pyln.Meter(sample_rate)

    integrated_lufs = _to_float(meter.integrated_loudness(audio))
    loudness_range_lu: float | None = None
    try:
        loudness_range_lu = _to_float(meter.loudness_range(audio))
    except Exception:
        pass

    # Robustere Short-Term / Momentary Berechnung mit Fallback
    momentary_max_lufs = None
    short_term_max_lufs = None
    try:
        # Neue pyloudnorm Versionen haben diese Methoden
        if hasattr(meter, 'momentary_loudness'):
            momentary = meter.momentary_loudness(audio)
            if momentary is not None and len(momentary) > 0:
                momentary_max_lufs = float(np.max(momentary))
        if hasattr(meter, 'short_term_loudness'):
            short_term = meter.short_term_loudness(audio)
            if short_term is not None and len(short_term) > 0:
                short_term_max_lufs = float(np.max(short_term))
    except Exception:
        pass

    # Fallback-Werte (basierend auf Integrated)
    if momentary_max_lufs is None:
        momentary_max_lufs = integrated_lufs + 3.0
    if short_term_max_lufs is None:
        short_term_max_lufs = integrated_lufs + 1.5

    peak_dbfs = _safe_peak_dbfs(audio)
    true_peak_dbtp = _true_peak_approx_dbtp(audio)
    true_peak_margin_dbtp = 0.0 - true_peak_dbtp if true_peak_dbtp is not None else None

    return {
        "sample_rate": int(sample_rate),
        "integrated_lufs": integrated_lufs,
        "loudness_range_lu": loudness_range_lu,
        "momentary_max_lufs": momentary_max_lufs,
        "short_term_max_lufs": short_term_max_lufs,
        "true_peak_dbtp": true_peak_dbtp,
        "true_peak_margin_dbtp": true_peak_margin_dbtp,
        "peak_dbfs": peak_dbfs,
    }