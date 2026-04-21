from __future__ import annotations

import math

import numpy as np
import pyloudnorm as pyln
from scipy.interpolate import interp1d


MOMENTARY_WINDOW_SECONDS = 0.4
SHORT_TERM_WINDOW_SECONDS = 3.0
LOUDNESS_WINDOW_HOP_SECONDS = 0.1

CHANNEL_GAIN_WEIGHTS = [1.0, 1.0, 1.0, 1.41, 1.41]


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


def _apply_k_weighting(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    array = _prepare_audio_for_loudness(audio).astype(np.float64, copy=True)

    if array.ndim == 1:
        array = np.reshape(array, (array.shape[0], 1))

    meter = pyln.Meter(sample_rate)

    for _, filter_stage in meter._filters.items():
        for channel_index in range(array.shape[1]):
            array[:, channel_index] = filter_stage.apply_filter(array[:, channel_index])

    return array


def _window_loudness_lufs(weighted_window: np.ndarray) -> float | None:
    if weighted_window.size == 0:
        return None

    if weighted_window.ndim == 1:
        weighted_window = np.reshape(weighted_window, (weighted_window.shape[0], 1))

    channel_count = weighted_window.shape[1]
    if channel_count == 0:
        return None

    weighted_sum = 0.0

    for channel_index in range(channel_count):
        channel_audio = weighted_window[:, channel_index]
        if channel_audio.size == 0:
            continue

        mean_square = float(np.mean(np.square(channel_audio, dtype=np.float64)))
        gain = CHANNEL_GAIN_WEIGHTS[channel_index] if channel_index < len(CHANNEL_GAIN_WEIGHTS) else 1.0
        weighted_sum += gain * mean_square

    if weighted_sum <= 0.0:
        return None

    return float(-0.691 + 10.0 * math.log10(weighted_sum))


def _iterate_window_start_indices(
    total_samples: int,
    window_samples: int,
    hop_samples: int,
) -> list[int]:
    if total_samples < window_samples or window_samples <= 0 or hop_samples <= 0:
        return []

    starts = list(range(0, total_samples - window_samples + 1, hop_samples))

    last_start = total_samples - window_samples
    if not starts or starts[-1] != last_start:
        starts.append(last_start)

    return starts


def _max_window_loudness(
    audio: np.ndarray,
    sample_rate: int,
    window_seconds: float,
    hop_seconds: float = LOUDNESS_WINDOW_HOP_SECONDS,
) -> float | None:
    weighted_audio = _apply_k_weighting(audio, sample_rate)

    total_samples = weighted_audio.shape[0]
    window_samples = int(round(window_seconds * sample_rate))
    hop_samples = int(round(hop_seconds * sample_rate))

    starts = _iterate_window_start_indices(
        total_samples=total_samples,
        window_samples=window_samples,
        hop_samples=hop_samples,
    )

    if not starts:
        return None

    values: list[float] = []

    for start_index in starts:
        end_index = start_index + window_samples
        window = weighted_audio[start_index:end_index]

        loudness_value = _window_loudness_lufs(window)
        if loudness_value is not None and np.isfinite(loudness_value):
            values.append(float(loudness_value))

    if not values:
        return None

    return float(max(values))


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

    momentary_max_lufs = _max_window_loudness(
        audio=audio,
        sample_rate=sample_rate,
        window_seconds=MOMENTARY_WINDOW_SECONDS,
    )
    short_term_max_lufs = _max_window_loudness(
        audio=audio,
        sample_rate=sample_rate,
        window_seconds=SHORT_TERM_WINDOW_SECONDS,
    )

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
