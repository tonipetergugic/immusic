from __future__ import annotations

from typing import Any

import numpy as np
from scipy.signal import butter, sosfiltfilt


EPSILON = 1e-12


def _safe_rms(signal: np.ndarray) -> float:
    if signal.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(signal, dtype=np.float64))))


def _safe_db_from_rms(rms_value: float) -> float | None:
    if rms_value <= EPSILON:
        return None
    return float(20.0 * np.log10(rms_value))


def _safe_phase_correlation(left: np.ndarray, right: np.ndarray) -> float | None:
    if left.size < 2 or right.size < 2:
        return None

    left_std = float(np.std(left))
    right_std = float(np.std(right))

    if left_std <= EPSILON or right_std <= EPSILON:
        return None

    correlation = float(np.corrcoef(left, right)[0, 1])

    if not np.isfinite(correlation):
        return None

    return float(np.clip(correlation, -1.0, 1.0))


def _bandpass_filter(signal: np.ndarray, sample_rate: int, low_hz: float, high_hz: float) -> np.ndarray:
    nyquist = sample_rate / 2.0

    low = max(low_hz / nyquist, EPSILON)
    high = min(high_hz / nyquist, 0.999)

    if low >= high:
        return np.zeros_like(signal, dtype=np.float64)

    sos = butter(
        N=4,
        Wn=[low, high],
        btype="bandpass",
        output="sos",
    )

    return sosfiltfilt(sos, signal.astype(np.float64, copy=False))


def _analyze_band(
    left: np.ndarray,
    right: np.ndarray,
    sample_rate: int,
    low_hz: float,
    high_hz: float,
    *,
    include_balance: bool,
) -> dict[str, Any]:
    left_band = _bandpass_filter(left, sample_rate, low_hz, high_hz)
    right_band = _bandpass_filter(right, sample_rate, low_hz, high_hz)

    mono_band = (left_band + right_band) / 2.0

    left_rms = _safe_rms(left_band)
    right_rms = _safe_rms(right_band)
    mono_rms = _safe_rms(mono_band)
    avg_lr_rms = (left_rms + right_rms) / 2.0

    if avg_lr_rms <= EPSILON:
        mono_retention = None
        mono_loss = None
    else:
        mono_retention = float(np.clip((mono_rms / avg_lr_rms) * 100.0, 0.0, 100.0))
        mono_loss = float(100.0 - mono_retention)

    phase_correlation = _safe_phase_correlation(left_band, right_band)

    result: dict[str, Any] = {
        "range_hz": [int(low_hz), int(high_hz)],
        "mono_energy_retention_percent": mono_retention,
        "mono_loss_percent": mono_loss,
        "phase_correlation": phase_correlation,
    }

    if include_balance:
        left_db = _safe_db_from_rms(left_rms)
        right_db = _safe_db_from_rms(right_rms)

        if left_db is None or right_db is None:
            low_band_balance_db = None
        else:
            # RMS energy difference in the low band (Left minus Right), expressed in dB.
            # 0.0 = centered low-end.
            # Positive values = more low-end energy on the left.
            # Negative values = more low-end energy on the right.
            low_band_balance_db = float(left_db - right_db)

        result["low_band_balance_db"] = low_band_balance_db

    return result


def analyze_low_end(audio_stereo: np.ndarray, sample_rate: int) -> dict[str, Any]:
    if audio_stereo.ndim != 2 or audio_stereo.shape[0] != 2:
        return {
            "sample_rate": int(sample_rate),
            "low_band_range_hz": [20, 120],
            "mono_energy_retention_low_band_percent": None,
            "mono_loss_low_band_percent": None,
            "phase_correlation_low_band": None,
            "low_band_balance_db": None,
            "sub_band_detail": {
                "20_60_hz": {
                    "range_hz": [20, 60],
                    "mono_energy_retention_percent": None,
                    "mono_loss_percent": None,
                    "phase_correlation": None,
                },
                "60_120_hz": {
                    "range_hz": [60, 120],
                    "mono_energy_retention_percent": None,
                    "mono_loss_percent": None,
                    "phase_correlation": None,
                },
            },
        }

    left = audio_stereo[0]
    right = audio_stereo[1]

    main_band = _analyze_band(
        left,
        right,
        sample_rate,
        20.0,
        120.0,
        include_balance=True,
    )

    sub_20_60 = _analyze_band(
        left,
        right,
        sample_rate,
        20.0,
        60.0,
        include_balance=False,
    )

    sub_60_120 = _analyze_band(
        left,
        right,
        sample_rate,
        60.0,
        120.0,
        include_balance=False,
    )

    return {
        "sample_rate": int(sample_rate),
        "low_band_range_hz": [20, 120],
        "mono_energy_retention_low_band_percent": main_band["mono_energy_retention_percent"],
        "mono_loss_low_band_percent": main_band["mono_loss_percent"],
        "phase_correlation_low_band": main_band["phase_correlation"],
        "low_band_balance_db": main_band["low_band_balance_db"],
        "sub_band_detail": {
            "20_60_hz": sub_20_60,
            "60_120_hz": sub_60_120,
        },
    }
