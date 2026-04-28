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
    if times.size == 0:
        return None

    fig, ax = plt.subplots(figsize=(14, 3))

    fig.patch.set_alpha(0.0)
    ax.set_facecolor("none")

    ax.plot(times, audio_mono, linewidth=0.45, alpha=0.95)

    ax.set_xlim(float(times[0]), float(times[-1]))
    ax.set_ylim(-1.05, 1.05)

    ax.axis("off")

    fig.subplots_adjust(left=0, right=1, top=1, bottom=0)
    fig.savefig(
        output_path,
        dpi=150,
        transparent=True,
        bbox_inches="tight",
        pad_inches=0,
    )
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
    macro_payload = getattr(result, "macro_sections", {})
    macro_sections = (
        macro_payload.get("macro_sections", [])
        if isinstance(macro_payload, dict)
        else []
    )
    ignored_boundary_bar_indices = set(
        int(bar_index)
        for bar_index in macro_payload.get("ignored_boundary_bar_indices", [])
    ) if isinstance(macro_payload, dict) else set()

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
    x_min, x_max = ax.get_xlim()
    x_span = max(0.0, x_max - x_min)
    label_x_margin = x_span * 0.03
    label_x_min = x_min + label_x_margin
    label_x_max = x_max - label_x_margin

    macro_label_y_top = 1.06
    macro_label_y_bottom = 1.01
    label_y_top = 0.78
    label_y_bottom = 0.62

    for macro_section in macro_sections:
        start_sec = float(macro_section["start_sec"])
        end_sec = float(macro_section["end_sec"])
        macro_index = int(macro_section["index"])
        center_sec = (start_sec + end_sec) / 2.0
        label_center_sec = min(max(center_sec, label_x_min), label_x_max)
        start_label = _format_seconds_mmss(start_sec, 0)
        end_label = _format_seconds_mmss(end_sec, 0)
        label = f"M{macro_index + 1} ({start_label}-{end_label})"
        label_y = macro_label_y_top if macro_index % 2 == 0 else macro_label_y_bottom

        ax.axvline(start_sec, color="#1f2d3d", linewidth=1.8, alpha=0.9, zorder=4)
        ax.text(
            label_center_sec,
            label_y,
            label,
            transform=ax.get_xaxis_transform(),
            ha="center",
            va="top",
            fontsize=8,
            fontweight="bold",
            bbox={
                "boxstyle": "round,pad=0.24",
                "facecolor": "#f7f1df",
                "edgecolor": "#a67c00",
                "alpha": 0.95,
            },
            zorder=5,
        )

    for section in sections:
        start_sec = float(section["start_sec"])
        end_sec = float(section["end_sec"])
        section_index = int(section["index"])
        center_sec = (start_sec + end_sec) / 2.0
        label_center_sec = min(max(center_sec, label_x_min), label_x_max)
        start_label = _format_seconds_mmss(start_sec, 0)
        end_label = _format_seconds_mmss(end_sec, 0)
        label = f"S{section_index + 1}\n({start_label}-{end_label})"
        label_y = label_y_top if section_index % 2 == 0 else label_y_bottom

        is_ignored_boundary = int(section["start_bar_index"]) in ignored_boundary_bar_indices

        line_color = "#b8c1cd" if is_ignored_boundary else "#4f5965"
        line_alpha = 0.5 if is_ignored_boundary else 0.9
        line_width = 1.0 if is_ignored_boundary else 1.25

        bbox_facecolor = "#f6f8fb" if is_ignored_boundary else "white"
        bbox_edgecolor = "#d8dee8" if is_ignored_boundary else "#c7cfdb"
        bbox_alpha = 0.65 if is_ignored_boundary else 0.9
        text_alpha = 0.6 if is_ignored_boundary else 1.0

        ax.axvline(
            start_sec,
            color=line_color,
            linewidth=line_width,
            alpha=line_alpha,
            zorder=3,
        )
        ax.text(
            label_center_sec,
            label_y,
            label,
            transform=ax.get_xaxis_transform(),
            ha="center",
            va="top",
            rotation=90,
            rotation_mode="anchor",
            fontsize=8,
            fontweight="bold",
            alpha=text_alpha,
            bbox={
                "boxstyle": "round,pad=0.2",
                "facecolor": bbox_facecolor,
                "edgecolor": bbox_edgecolor,
                "alpha": bbox_alpha,
            },
            zorder=5,
        )

    if sections:
        last_end_sec = float(sections[-1]["end_sec"])
        ax.axvline(last_end_sec, color="#5b6470", linewidth=1.0, alpha=0.7, zorder=3)
    if macro_sections:
        last_macro_end_sec = float(macro_sections[-1]["end_sec"])
        ax.axvline(last_macro_end_sec, color="#1f2d3d", linewidth=1.8, alpha=0.9, zorder=4)

    fig.tight_layout(rect=(0.0, 0.0, 1.0, 0.88))
    fig.savefig(output_path, dpi=150)
    plt.close(fig)

    return output_path
