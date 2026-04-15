from __future__ import annotations

import librosa
import numpy as np


FEATURE_NAMES: list[str] = [
    "rms_mean",
    "spectral_centroid_mean",
    "spectral_bandwidth_mean",
    "spectral_rolloff_mean",
    "zero_crossing_rate_mean",
    "spectral_flatness_mean",
    "mfcc_1_mean",
    "mfcc_2_mean",
    "mfcc_3_mean",
    "mfcc_4_mean",
    "mfcc_5_mean",
    "mfcc_6_mean",
    "mfcc_7_mean",
    "mfcc_8_mean",
    "mfcc_9_mean",
    "mfcc_10_mean",
    "mfcc_11_mean",
    "mfcc_12_mean",
    "mfcc_13_mean",
    "chroma_1_mean",
    "chroma_2_mean",
    "chroma_3_mean",
    "chroma_4_mean",
    "chroma_5_mean",
    "chroma_6_mean",
    "chroma_7_mean",
    "chroma_8_mean",
    "chroma_9_mean",
    "chroma_10_mean",
    "chroma_11_mean",
    "chroma_12_mean",
]


def _empty_feature_vector() -> list[float]:
    return [0.0] * len(FEATURE_NAMES)


def _mean_feature_value(values: np.ndarray) -> float:
    if values.size == 0:
        return 0.0
    return float(np.mean(values))


def _slice_audio_bar(audio: np.ndarray, sr: int, start_sec: float, end_sec: float) -> np.ndarray:
    if sr <= 0 or audio.size == 0:
        return np.asarray([], dtype=audio.dtype)

    duration_sec = float(audio.size) / float(sr)
    clamped_start = min(max(float(start_sec), 0.0), duration_sec)
    clamped_end = min(max(float(end_sec), 0.0), duration_sec)

    start_idx = int(round(clamped_start * sr))
    end_idx = int(round(clamped_end * sr))

    start_idx = min(max(start_idx, 0), audio.size)
    end_idx = min(max(end_idx, 0), audio.size)

    if end_idx <= start_idx:
        return np.asarray([], dtype=audio.dtype)

    return audio[start_idx:end_idx]


def _extract_single_bar_vector(segment: np.ndarray, sr: int) -> list[float]:
    if segment.size < 32 or sr <= 0:
        return _empty_feature_vector()

    n_fft = int(min(2048, segment.size))
    if n_fft < 32:
        return _empty_feature_vector()

    hop_length = max(1, n_fft // 4)

    try:
        rms = librosa.feature.rms(y=segment, frame_length=n_fft, hop_length=hop_length, center=False)
        spectral_centroid = librosa.feature.spectral_centroid(
            y=segment,
            sr=sr,
            n_fft=n_fft,
            hop_length=hop_length,
            center=False,
        )
        spectral_bandwidth = librosa.feature.spectral_bandwidth(
            y=segment,
            sr=sr,
            n_fft=n_fft,
            hop_length=hop_length,
            center=False,
        )
        spectral_rolloff = librosa.feature.spectral_rolloff(
            y=segment,
            sr=sr,
            n_fft=n_fft,
            hop_length=hop_length,
            center=False,
        )
        zero_crossing_rate = librosa.feature.zero_crossing_rate(
            segment,
            frame_length=n_fft,
            hop_length=hop_length,
            center=False,
        )
        spectral_flatness = librosa.feature.spectral_flatness(
            y=segment,
            n_fft=n_fft,
            hop_length=hop_length,
        )
        mfcc = librosa.feature.mfcc(
            y=segment,
            sr=sr,
            n_mfcc=13,
            n_fft=n_fft,
            hop_length=hop_length,
        )
        chroma = librosa.feature.chroma_stft(
            y=segment,
            sr=sr,
            n_fft=n_fft,
            hop_length=hop_length,
            center=False,
            n_chroma=12,
        )
    except Exception:
        return _empty_feature_vector()

    features: list[float] = [
        _mean_feature_value(rms),
        _mean_feature_value(spectral_centroid),
        _mean_feature_value(spectral_bandwidth),
        _mean_feature_value(spectral_rolloff),
        _mean_feature_value(zero_crossing_rate),
        _mean_feature_value(spectral_flatness),
    ]

    for index in range(13):
        if index < mfcc.shape[0]:
            features.append(_mean_feature_value(mfcc[index]))
        else:
            features.append(0.0)

    for index in range(12):
        if index < chroma.shape[0]:
            features.append(_mean_feature_value(chroma[index]))
        else:
            features.append(0.0)

    return [float(value) for value in features]


def extract_bar_features(
    audio: np.ndarray,
    sr: int,
    bars: list[list[float]],
) -> tuple[list[str], list[list[float]]]:
    bar_feature_vectors: list[list[float]] = []

    for bar in bars:
        if len(bar) < 2:
            bar_feature_vectors.append(_empty_feature_vector())
            continue

        start_sec = float(bar[0])
        end_sec = float(bar[1])
        segment = _slice_audio_bar(audio, sr, start_sec, end_sec)
        bar_feature_vectors.append(_extract_single_bar_vector(segment, sr))

    return FEATURE_NAMES[:], bar_feature_vectors
