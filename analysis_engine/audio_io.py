from __future__ import annotations

from pathlib import Path

import librosa
import numpy as np
import soundfile as sf


def load_audio_mono(audio_path: str | Path, target_sr: int | None = None) -> tuple[np.ndarray, int]:
    path = Path(audio_path)

    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    audio, sr = librosa.load(path.as_posix(), sr=target_sr, mono=True)

    if audio.size == 0:
        raise ValueError(f"Loaded audio is empty: {path}")

    return audio.astype(np.float32, copy=False), int(sr)


def get_duration_seconds(audio_path: str | Path) -> float:
    info = sf.info(Path(audio_path).as_posix())
    return float(info.duration)


def compute_rms(audio: np.ndarray) -> float:
    if audio.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio))))


def slice_audio_by_seconds(audio: np.ndarray, sr: int, start_sec: float, end_sec: float) -> np.ndarray:
    if sr <= 0:
        return np.asarray([], dtype=audio.dtype)

    total_duration_sec = float(audio.size) / float(sr)
    clamped_start = min(max(float(start_sec), 0.0), total_duration_sec)
    clamped_end = min(max(float(end_sec), 0.0), total_duration_sec)

    start_index = int(round(clamped_start * sr))
    end_index = int(round(clamped_end * sr))

    start_index = min(max(start_index, 0), audio.size)
    end_index = min(max(end_index, 0), audio.size)

    if end_index <= start_index:
        return np.asarray([], dtype=audio.dtype)

    return audio[start_index:end_index]
