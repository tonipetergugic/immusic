from __future__ import annotations

import math

import numpy as np
from scipy.signal import butter, sosfiltfilt

from analysis_engine.schemas import SpectralRmsBasis, SpectralRmsMetrics


FFT_SIZE = 4096
HOP_LENGTH = 1024

BANDS_HZ: dict[str, tuple[float, float]] = {
    "sub": (20.0, 60.0),
    "low": (60.0, 250.0),
    "mid": (250.0, 2000.0),
    "high": (2000.0, 8000.0),
    "air": (8000.0, 16000.0),
}


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


def _rms_dbfs(signal: np.ndarray) -> float | None:
    if signal.size == 0:
        return None

    rms = float(np.sqrt(np.mean(np.square(signal, dtype=np.float64))))
    if rms <= 0.0 or not math.isfinite(rms):
        return None

    return float(20.0 * math.log10(rms))


def _bandpass_filter(signal: np.ndarray, sample_rate: int, low_hz: float, high_hz: float) -> np.ndarray | None:
    nyquist = sample_rate / 2.0
    safe_low = max(1.0, low_hz)
    safe_high = min(high_hz, nyquist * 0.98)

    if safe_low >= safe_high:
        return None

    try:
        sos = butter(
            4,
            [safe_low, safe_high],
            btype="bandpass",
            fs=sample_rate,
            output="sos",
        )
        return sosfiltfilt(sos, signal).astype(np.float32, copy=False)
    except Exception:
        return None


def _band_rms_dbfs(
    mono: np.ndarray,
    sample_rate: int,
    low_hz: float,
    high_hz: float,
) -> float | None:
    filtered = _bandpass_filter(mono, sample_rate, low_hz, high_hz)

    if filtered is None:
        return None

    return _rms_dbfs(filtered)


def analyze_spectral_rms(audio_signal: np.ndarray, sample_rate: int) -> SpectralRmsMetrics:
    if sample_rate <= 0:
        return SpectralRmsMetrics(status="not_available", basis=SpectralRmsBasis())

    mono = _to_mono(audio_signal)

    if mono.size == 0:
        return SpectralRmsMetrics(status="not_available", basis=SpectralRmsBasis())

    values = {
        band_name: _band_rms_dbfs(mono, sample_rate, band_low, band_high)
        for band_name, (band_low, band_high) in BANDS_HZ.items()
    }

    if all(value is None for value in values.values()):
        return SpectralRmsMetrics(status="not_available", basis=SpectralRmsBasis())

    return SpectralRmsMetrics(
        status="available",
        sub_rms_dbfs=values["sub"],
        low_rms_dbfs=values["low"],
        mid_rms_dbfs=values["mid"],
        high_rms_dbfs=values["high"],
        air_rms_dbfs=values["air"],
        basis=SpectralRmsBasis(
            method="bandpass_time_domain_rms_dbfs",
            fft_size=FFT_SIZE,
            hop_length=HOP_LENGTH,
            bands_hz={
                "sub": [20.0, 60.0],
                "low": [60.0, 250.0],
                "mid": [250.0, 2000.0],
                "high": [2000.0, 8000.0],
                "air": [8000.0, 16000.0],
            },
        ),
    )
