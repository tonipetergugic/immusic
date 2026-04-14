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
