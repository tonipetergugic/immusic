from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

from analysis_engine.schemas import AudioFileInfo


def read_audio_file_info(path: str | Path, track_id: str | None = None) -> AudioFileInfo:
    file_path = Path(path)
    info = sf.info(str(file_path))

    return AudioFileInfo(
        path=str(file_path),
        track_id=track_id,
        filename=file_path.name,
        stem=file_path.stem,
        extension=file_path.suffix.lower(),
        sample_rate=int(info.samplerate),
        channels=int(info.channels),
        duration_sec=float(info.duration),
    )


def load_audio_mono(path: str | Path, dtype: str = "float32") -> tuple[np.ndarray, int]:
    """
    Rohes Analyse-Mono ohne Loudness-Kalibrierung.
    Dieses Signal ist für Struktur-/Feature-Analysen gedacht,
    nicht als spezieller Loudness-Messpfad.
    """
    audio, sample_rate = sf.read(str(path), dtype=dtype, always_2d=True)
    mono = np.mean(audio, axis=1, dtype=np.float32)
    return mono.astype(np.float32, copy=False), int(sample_rate)


def load_audio_stereo(path: str | Path, dtype: str = "float32") -> tuple[np.ndarray, int]:
    audio, sample_rate = sf.read(str(path), dtype=dtype, always_2d=True)
    stereo = np.transpose(audio)
    return stereo.astype(np.float32, copy=False), int(sample_rate)
