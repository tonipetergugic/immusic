from __future__ import annotations

import librosa
import numpy as np


BAR_FEATURE_NAMES = [
    "rms_mean",
    "rms_std",
    "zcr_mean",
    "zcr_std",
    "spectral_centroid_mean",
    "spectral_centroid_std",
    "spectral_bandwidth_mean",
    "spectral_bandwidth_std",
    "spectral_rolloff_mean",
    "spectral_rolloff_std",
]


def _safe_mean(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    return float(np.mean(values))


def _safe_std(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    return float(np.std(values))


def _cosine_distance(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    a = np.asarray(vector_a, dtype=np.float32)
    b = np.asarray(vector_b, dtype=np.float32)

    a_norm = float(np.linalg.norm(a))
    b_norm = float(np.linalg.norm(b))

    if a_norm == 0.0 and b_norm == 0.0:
        return 0.0

    if a_norm == 0.0 or b_norm == 0.0:
        return 1.0

    similarity = float(np.dot(a, b) / (a_norm * b_norm))
    similarity = max(-1.0, min(1.0, similarity))
    return float(1.0 - similarity)


def _slice_audio_by_seconds(
    audio: np.ndarray,
    sample_rate: int,
    start_sec: float,
    end_sec: float,
) -> np.ndarray:
    start_index = max(0, int(round(start_sec * sample_rate)))
    end_index = min(audio.shape[0], int(round(end_sec * sample_rate)))

    if end_index <= start_index:
        return np.zeros(1, dtype=np.float32)

    return np.asarray(audio[start_index:end_index], dtype=np.float32)


def _compute_feature_metrics(audio: np.ndarray, sample_rate: int) -> dict[str, float]:
    if audio.size < 2:
        return {name: 0.0 for name in BAR_FEATURE_NAMES}

    rms = librosa.feature.rms(y=audio)[0]
    zcr = librosa.feature.zero_crossing_rate(y=audio)[0]
    centroid = librosa.feature.spectral_centroid(y=audio, sr=sample_rate)[0]
    bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sample_rate)[0]
    rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sample_rate)[0]

    return {
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


def analyze_features(
    audio_mono: np.ndarray,
    sample_rate: int,
    bars: list[dict[str, float | int]] | None = None,
) -> dict[str, float | int | list[str] | list[list[float]]]:
    audio = np.asarray(audio_mono, dtype=np.float32)

    if audio.ndim != 1:
        raise ValueError("analyze_features expects mono audio with shape (samples,)")

    if audio.size == 0:
        raise ValueError("analyze_features received empty audio")

    rms = librosa.feature.rms(y=audio)[0]
    global_metrics = _compute_feature_metrics(audio, sample_rate)

    result: dict[str, float | int | list[str] | list[list[float]]] = {
        "sample_rate": int(sample_rate),
        "frame_count": int(rms.shape[0]),
        **global_metrics,
    }

    if bars:
        bar_feature_vectors: list[list[float]] = []

        for bar in bars:
            start_sec = float(bar["start"])
            end_sec = float(bar["end"])
            bar_audio = _slice_audio_by_seconds(audio, sample_rate, start_sec, end_sec)
            bar_metrics = _compute_feature_metrics(bar_audio, sample_rate)
            feature_vector = [float(bar_metrics[name]) for name in BAR_FEATURE_NAMES]
            bar_feature_vectors.append(feature_vector)

        feature_matrix = np.asarray(bar_feature_vectors, dtype=np.float32)
        feature_means = np.mean(feature_matrix, axis=0)
        feature_stds = np.std(feature_matrix, axis=0)
        safe_feature_stds = np.where(feature_stds < 1e-8, 1.0, feature_stds)
        normalized_feature_matrix = (feature_matrix - feature_means) / safe_feature_stds

        bar_delta_from_prev: list[float] = []
        bar_similarity_prev_to_here: list[float] = []
        bar_forward_stability: list[float] = []

        for index in range(len(bar_feature_vectors)):
            current_array = normalized_feature_matrix[index]

            if index == 0:
                bar_delta_from_prev.append(0.0)
                bar_similarity_prev_to_here.append(1.0)
            else:
                prev_start_index = max(0, index - 4)
                prev_vectors = normalized_feature_matrix[prev_start_index:index]
                prev_mean_vector = np.mean(prev_vectors, axis=0)

                delta_value = _cosine_distance(current_array, prev_mean_vector)
                similarity_value = 1.0 - delta_value
                similarity_value = max(0.0, min(1.0, float(similarity_value)))

                bar_delta_from_prev.append(float(delta_value))
                bar_similarity_prev_to_here.append(float(similarity_value))

            next_vectors = normalized_feature_matrix[index + 1:index + 3]
            if len(next_vectors) == 0:
                bar_forward_stability.append(0.0)
            else:
                similarity_to_next_values: list[float] = []

                for next_array in next_vectors:
                    next_delta = _cosine_distance(current_array, next_array)
                    next_similarity = 1.0 - next_delta
                    next_similarity = max(0.0, min(1.0, float(next_similarity)))
                    similarity_to_next_values.append(float(next_similarity))

                forward_stability_value = float(np.mean(similarity_to_next_values))
                bar_forward_stability.append(forward_stability_value)

        result["feature_names"] = list(BAR_FEATURE_NAMES)
        result["bar_feature_vectors"] = bar_feature_vectors
        result["bar_vector_count"] = len(bar_feature_vectors)
        result["bar_delta_from_prev"] = bar_delta_from_prev
        result["bar_similarity_prev_to_here"] = bar_similarity_prev_to_here
        result["bar_forward_stability"] = bar_forward_stability

    return result
