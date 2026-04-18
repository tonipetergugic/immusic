from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT_DIR / "output"


@dataclass(frozen=True)
class AnalysisConfig:
    sample_rate: int = 44100
    mono: bool = True
    hop_length: int = 512
    n_fft: int = 2048
    top_db: float = 60.0
    min_silence_duration_sec: float = 0.15
    plot_dpi: int = 140


DEFAULT_CONFIG = AnalysisConfig()


def ensure_output_dir() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR