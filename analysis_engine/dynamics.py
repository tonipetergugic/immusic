from __future__ import annotations

from typing import Any

import numpy as np


EPSILON = 1e-12


def _flatten_audio(audio_signal: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio_signal, dtype=np.float64)

    if audio.size == 0:
        return np.zeros(0, dtype=np.float64)

    return audio.reshape(-1)


def _safe_db_from_linear(value: float) -> float | None:
    if value <= EPSILON:
        return None
    return float(20.0 * np.log10(value))


def analyze_dynamics(audio_signal: np.ndarray, loudness_result: dict[str, Any] | None = None) -> dict[str, Any]:
    flat_audio = _flatten_audio(audio_signal)

    if flat_audio.size == 0:
        return {
            "crest_factor_db": None,
            "integrated_rms_dbfs": None,
            "plr_lu": None,
            "psr_lu": None,
        }

    peak_linear = float(np.max(np.abs(flat_audio)))
    rms_linear = float(np.sqrt(np.mean(np.square(flat_audio, dtype=np.float64))))

    peak_dbfs = _safe_db_from_linear(peak_linear)
    integrated_rms_dbfs = _safe_db_from_linear(rms_linear)

    if peak_dbfs is None or integrated_rms_dbfs is None:
        crest_factor_db = None
    else:
        crest_factor_db = float(peak_dbfs - integrated_rms_dbfs)

    true_peak_dbtp = None
    integrated_lufs = None
    short_term_max_lufs = None

    if loudness_result:
        true_peak_dbtp = loudness_result.get("true_peak_dbtp")
        integrated_lufs = loudness_result.get("integrated_lufs")
        short_term_max_lufs = loudness_result.get("short_term_max_lufs")

    if true_peak_dbtp is not None and integrated_lufs is not None:
        plr_lu = float(float(true_peak_dbtp) - float(integrated_lufs))
    else:
        plr_lu = None

    if true_peak_dbtp is not None and short_term_max_lufs is not None:
        psr_lu = float(float(true_peak_dbtp) - float(short_term_max_lufs))
    else:
        psr_lu = None

    return {
        "crest_factor_db": crest_factor_db,
        "integrated_rms_dbfs": integrated_rms_dbfs,
        "plr_lu": plr_lu,
        "psr_lu": psr_lu,
    }
