from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf


@dataclass
class AudioData:
    path: str
    track_id: str
    y: np.ndarray
    sr: int
    duration_sec: float
    source_sr: int
    channels: int


def load_audio(path: str, target_sr: int = 22050, mono: bool = True) -> AudioData:
    audio_path = Path(path).expanduser().resolve()
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    try:
        info = sf.info(str(audio_path))
    except RuntimeError as exc:
        raise ValueError(f"Unsupported or unreadable audio file: {audio_path}") from exc

    y, sr = librosa.load(str(audio_path), sr=target_sr, mono=mono)
    if y.size == 0:
        raise ValueError(f"Loaded audio is empty: {audio_path}")

    return AudioData(
        path=str(audio_path),
        track_id=audio_path.stem,
        y=y,
        sr=int(sr),
        duration_sec=float(len(y) / sr),
        source_sr=int(info.samplerate),
        channels=int(info.channels),
    )
