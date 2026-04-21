from __future__ import annotations

import numpy as np

from analysis_engine.schemas import DynamicsMetrics, LoudnessMetrics


EPSILON = 1e-12

# Contract:
# - crest_factor_db:
#   global sample-peak dBFS minus integrated RMS dBFS over the full signal
# - integrated_rms_dbfs:
#   full-signal RMS level in dBFS
# - plr_lu:
#   global true_peak_dbtp minus integrated_lufs
#   this uses the already computed loudness block as source of truth


def _flatten_audio(audio_signal: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio_signal, dtype=np.float64)

    if audio.size == 0:
        return np.zeros(0, dtype=np.float64)

    return audio.reshape(-1)


def _safe_db_from_linear(value: float) -> float | None:
    if value <= EPSILON:
        return None
    return float(20.0 * np.log10(value))


# Dynamics block policy:
# - measurement only
# - no scoring
# - no traffic-light logic
# - no automatic suspicion flags
# Interpretation belongs to a later layer, not this module.
def analyze_dynamics(audio_signal: np.ndarray, loudness_result: LoudnessMetrics | None = None) -> DynamicsMetrics:
    flat_audio = _flatten_audio(audio_signal)

    if flat_audio.size == 0:
        return DynamicsMetrics(
            crest_factor_db=None,
            integrated_rms_dbfs=None,
            plr_lu=None,
        )

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

    if loudness_result:
        true_peak_dbtp = loudness_result.true_peak_dbtp
        integrated_lufs = loudness_result.integrated_lufs

    if true_peak_dbtp is not None and integrated_lufs is not None:
        plr_lu = float(float(true_peak_dbtp) - float(integrated_lufs))
    else:
        plr_lu = None

    return DynamicsMetrics(
        crest_factor_db=crest_factor_db,
        integrated_rms_dbfs=integrated_rms_dbfs,
        plr_lu=plr_lu,
    )
