from __future__ import annotations

import numpy as np
import librosa


def _safe_mean(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    return float(np.mean(values))


def _safe_std(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    return float(np.std(values))


def analyze_features(audio_mono: np.ndarray, sample_rate: int) -> dict[str, float | int]:
    audio = np.asarray(audio_mono, dtype=np.float32)

    if audio.ndim != 1:
        raise ValueError("analyze_features expects mono audio with shape (samples,)")

    if audio.size == 0:
        raise ValueError("analyze_features received empty audio")

    rms = librosa.feature.rms(y=audio)[0]
    zcr = librosa.feature.zero_crossing_rate(y=audio)[0]
    centroid = librosa.feature.spectral_centroid(y=audio, sr=sample_rate)[0]
    bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sample_rate)[0]
    rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sample_rate)[0]

    return {
        "sample_rate": int(sample_rate),
        "frame_count": int(rms.shape[0]),
        "rms_mean": _safe_mean(rms),
        "rms_std": _safe_std(rms),
        "zcr_mean": _safe_mean(zcr),
        "zcr_std": _safe_std(zcr),
        "spectral_centroid_mean": _safe_mean(centroid),
        "spectral_centroid_std": _safe_std(centroid),
        "spectral_bandwidth_mean": _safe_mean(bandwidth),
        "spectral_bandwidth_std": _safe_std(bandwidth),
        "spectral_rolloff_mean": _safe_mean(rolloff),
        "spectral_rolloff_std": _safe_std(rolloff),
    }
