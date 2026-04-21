from __future__ import annotations

import math

import numpy as np
import pyloudnorm as pyln
from scipy.interpolate import interp1d


def _to_float(value) -> float:
    return float(value)


def _prepare_audio_for_loudness(audio: np.ndarray) -> np.ndarray:
    array = np.asarray(audio, dtype=np.float32)

    if array.ndim == 1:
        return array.astype(np.float32, copy=False)

    if array.ndim != 2 or array.size == 0:
        raise ValueError("analyze_loudness expects mono or stereo audio")

    # Unterstützt sowohl (samples, channels) als auch (channels, samples)
    if array.shape[0] <= 8 and array.shape[1] > array.shape[0]:
        array = np.transpose(array)

    return array.astype(np.float32, copy=False)


def _safe_peak_dbfs(audio: np.ndarray) -> float:
    array = np.asarray(audio, dtype=np.float32)
    if array.size == 0:
        return float("-inf")
    peak = float(np.max(np.abs(array)))
    if peak <= 0.0:
        return float("-inf")
    return 20.0 * math.log10(peak)


def _true_peak_approx_dbtp(audio: np.ndarray) -> float:
    array = _prepare_audio_for_loudness(audio)

    def _channel_true_peak(channel_audio: np.ndarray) -> float:
        if channel_audio.size < 32:
            return _safe_peak_dbfs(channel_audio)

        x = np.arange(len(channel_audio), dtype=np.float64)
        f = interp1d(x, channel_audio, kind="cubic", fill_value="extrapolate", bounds_error=False)
        x_up = np.linspace(0, len(channel_audio) - 1, 8 * len(channel_audio), endpoint=False)
        up = f(x_up)

        peak = float(np.max(np.abs(up)))
        return 20.0 * math.log10(peak) if peak > 0.0 else float("-inf")

    if array.ndim == 1:
        return _channel_true_peak(array)

    channel_peaks = [_channel_true_peak(array[:, channel_index]) for channel_index in range(array.shape[1])]
    return float(max(channel_peaks)) if channel_peaks else float("-inf")


def analyze_loudness(
    audio_input: np.ndarray,
    sample_rate: int,
) -> dict[str, float | None]:
    try:
        audio = _prepare_audio_for_loudness(audio_input)
    except ValueError:
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

    if audio.size == 0:
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

    momentary_max_lufs = None
    short_term_max_lufs = None
    try:
        if hasattr(meter, "momentary_loudness"):
            momentary = meter.momentary_loudness(audio)
            if momentary is not None and len(momentary) > 0:
                momentary_max_lufs = float(np.max(momentary))
        if hasattr(meter, "short_term_loudness"):
            short_term = meter.short_term_loudness(audio)
            if short_term is not None and len(short_term) > 0:
                short_term_max_lufs = float(np.max(short_term))
    except Exception:
        pass

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
