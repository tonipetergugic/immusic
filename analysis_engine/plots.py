from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from analysis_engine.schemas import AnalysisResult


def save_waveform_plot(
    audio_mono: np.ndarray,
    sample_rate: int,
    result: AnalysisResult,
) -> Path | None:
    output_path_str = result.artifacts.waveform_plot_path
    if not output_path_str:
        return None

    output_path = Path(output_path_str)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if audio_mono.size == 0 or sample_rate <= 0:
        return None

    times = np.arange(audio_mono.shape[0], dtype=np.float64) / float(sample_rate)

    fig, ax = plt.subplots(figsize=(14, 4))
    ax.plot(times, audio_mono, linewidth=0.5)
    ax.set_title("Waveform")
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Amplitude")
    ax.set_xlim(float(times[0]), float(times[-1]) if times.size > 0 else 0.0)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)

    return output_path
