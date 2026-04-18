from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import FuncFormatter

from analysis_engine.schemas import AnalysisResult


def _format_seconds_mmss(value: float, _pos: float) -> str:
    total_seconds = max(0, int(round(value)))
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes:02d}:{seconds:02d}"


def _get_audio_times(audio_mono: np.ndarray, sample_rate: int) -> np.ndarray:
    return np.arange(audio_mono.shape[0], dtype=np.float64) / float(sample_rate)


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

    times = _get_audio_times(audio_mono, sample_rate)

    fig, ax = plt.subplots(figsize=(14, 4))
    ax.plot(times, audio_mono, linewidth=0.5)
    ax.set_title("Waveform")
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Amplitude")
    ax.xaxis.set_major_formatter(FuncFormatter(_format_seconds_mmss))
    ax.set_xlim(float(times[0]), float(times[-1]) if times.size > 0 else 0.0)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)

    return output_path


def save_structure_plot(
    audio_mono: np.ndarray,
    sample_rate: int,
    result: AnalysisResult,
) -> Path | None:
    output_path_str = result.artifacts.structure_plot_path
    if not output_path_str:
        return None

    output_path = Path(output_path_str)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if audio_mono.size == 0 or sample_rate <= 0:
        return None

    times = _get_audio_times(audio_mono, sample_rate)
    if times.size == 0:
        return None

    sections = result.sections.get("sections", []) if isinstance(result.sections, dict) else []

    fig, ax = plt.subplots(figsize=(16, 5))
    ax.set_facecolor("#fafafa")

    for section in sections:
        start_sec = float(section["start_sec"])
        end_sec = float(section["end_sec"])
        section_index = int(section["index"])

        span_color = "#e9eef5" if section_index % 2 == 0 else "#dfe7f1"
        ax.axvspan(start_sec, end_sec, color=span_color, alpha=0.55, zorder=0)

    ax.plot(times, audio_mono, linewidth=0.45, alpha=0.85, zorder=2)

    ax.set_title("Structure View")
    ax.set_xlabel("Time (mm:ss)")
    ax.set_ylabel("Amplitude")
    ax.xaxis.set_major_formatter(FuncFormatter(_format_seconds_mmss))
    ax.set_xlim(float(times[0]), float(times[-1]))

    for section in sections:
        start_sec = float(section["start_sec"])
        end_sec = float(section["end_sec"])
        section_index = int(section["index"])
        center_sec = (start_sec + end_sec) / 2.0
        label = f"S{section_index + 1}"

        ax.axvline(start_sec, color="#5b6470", linewidth=1.0, alpha=0.7, zorder=3)
        ax.text(
            center_sec,
            0.965,
            label,
            transform=ax.get_xaxis_transform(),
            ha="center",
            va="top",
            fontsize=10,
            fontweight="bold",
            bbox={
                "boxstyle": "round,pad=0.2",
                "facecolor": "white",
                "edgecolor": "#c7cfdb",
                "alpha": 0.9,
            },
            zorder=4,
        )

    if sections:
        last_end_sec = float(sections[-1]["end_sec"])
        ax.axvline(last_end_sec, color="#5b6470", linewidth=1.0, alpha=0.7, zorder=3)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)

    return output_path
