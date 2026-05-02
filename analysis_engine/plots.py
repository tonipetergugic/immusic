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


def _clamp_label_x(x: float, x_min: float, x_max: float) -> float:
    return float(min(max(x, x_min), x_max))


def _assign_label_lanes(
    x_positions: list[float],
    min_gap: float,
    num_lanes: int,
    *,
    use_farthest_lane_fallback: bool = False,
) -> list[int]:
    """Greedy lane assignment: sort by x, place each label on first lane with enough clearance."""
    n = len(x_positions)
    if n == 0:
        return []
    if num_lanes <= 1:
        return [0] * n

    lanes = [0] * n
    last_x_in_lane = [-float("inf")] * num_lanes

    for i in sorted(range(n), key=lambda idx: x_positions[idx]):
        x = x_positions[i]
        chosen: int | None = None
        for lane in range(num_lanes):
            if x - last_x_in_lane[lane] >= min_gap:
                chosen = lane
                break
        if chosen is None:
            if use_farthest_lane_fallback:
                chosen = 0
                best_dist = -float("inf")
                for lane in range(num_lanes):
                    dist = abs(x - last_x_in_lane[lane])
                    if dist > best_dist:
                        best_dist = dist
                        chosen = lane
            else:
                chosen = i % num_lanes
        last_x_in_lane[chosen] = x
        lanes[i] = chosen

    return lanes


def _lane_y_fractions(num_lanes: int, y_high: float, y_low: float) -> np.ndarray:
    if num_lanes <= 1:
        return np.array([(y_high + y_low) / 2.0], dtype=np.float64)
    return np.linspace(y_high, y_low, num_lanes, dtype=np.float64)


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

    macro_min_gap = max(x_span * 0.055, 14.0)
    num_macro_lanes = min(8, max(2, len(macro_sections))) if macro_sections else 0
    macro_xs = [
        _clamp_label_x(
            (float(m["start_sec"]) + float(m["end_sec"])) / 2.0,
            label_x_min,
            label_x_max,
        )
        for m in macro_sections
    ]
    macro_lane_by_index = (
        _assign_label_lanes(macro_xs, macro_min_gap, num_macro_lanes) if macro_sections else []
    )
    macro_y_fracs = (
        _lane_y_fractions(num_macro_lanes, 1.12, 1.00) if num_macro_lanes else np.array([])
    )

    section_min_gap = max(x_span * 0.035, 8.0)
    num_section_lanes = min(12, max(2, len(sections) // 4 + 2)) if sections else 0
    section_xs = [
        _clamp_label_x(
            (float(s["start_sec"]) + float(s["end_sec"])) / 2.0,
            label_x_min,
            label_x_max,
        )
        for s in sections
    ]
    section_lane_by_index = (
        _assign_label_lanes(
            section_xs,
            section_min_gap,
            num_section_lanes,
            use_farthest_lane_fallback=True,
        )
        if sections
        else []
    )
    section_y_fracs = (
        _lane_y_fractions(num_section_lanes, 0.88, 0.42) if num_section_lanes else np.array([])
    )
    section_fontsize = 7.0 if len(sections) >= 48 else (7.5 if len(sections) >= 28 else 8.0)

    for macro_section, label_center_sec, lane_idx in zip(
        macro_sections, macro_xs, macro_lane_by_index
    ):
        start_sec = float(macro_section["start_sec"])
        end_sec = float(macro_section["end_sec"])
        macro_index = int(macro_section["index"])
        start_label = _format_seconds_mmss(start_sec, 0)
        end_label = _format_seconds_mmss(end_sec, 0)
        label = f"M{macro_index + 1} ({start_label}-{end_label})"
        label_y = float(macro_y_fracs[lane_idx])

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

    for section, label_center_sec, lane_idx in zip(
        sections, section_xs, section_lane_by_index
    ):
        start_sec = float(section["start_sec"])
        end_sec = float(section["end_sec"])
        section_index = int(section["index"])
        start_label = _format_seconds_mmss(start_sec, 0)
        end_label = _format_seconds_mmss(end_sec, 0)
        label = f"S{section_index + 1}\n({start_label}-{end_label})"
        label_y = float(section_y_fracs[lane_idx])

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
            fontsize=section_fontsize,
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
