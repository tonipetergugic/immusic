from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from schemas import Section


def _boundary_indices_from_times(boundary_candidates: list[float], bars: list[list[float]]) -> list[int]:
    if not bars:
        return []

    indices: list[int] = []
    for candidate in boundary_candidates:
        candidate_time = float(candidate)
        best_index = None
        for index, bar in enumerate(bars):
            if len(bar) < 2:
                continue
            start = float(bar[0])
            end = float(bar[1])
            if start <= candidate_time <= end:
                best_index = index
                break
            if start >= candidate_time:
                best_index = index
                break
        if best_index is None:
            best_index = max(0, len(bars) - 1)
        indices.append(int(best_index))
    return indices


def write_debug_plots(
    output_dir: Path,
    trackname: str,
    self_similarity_matrix: list[list[float]],
    novelty_curve: list[float],
    boundary_candidates: list[float],
    bars: list[list[float]],
    sections: list[Section],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    ssm = np.asarray(self_similarity_matrix, dtype=np.float64)
    novelty = np.asarray(novelty_curve, dtype=np.float64)
    novelty = np.nan_to_num(novelty, nan=0.0, posinf=0.0, neginf=0.0)
    boundary_indices = _boundary_indices_from_times(boundary_candidates, bars)

    ssm_path = output_dir / f"{trackname}_ssm.png"
    novelty_path = output_dir / f"{trackname}_novelty.png"
    sections_path = output_dir / f"{trackname}_sections.png"

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.imshow(ssm, aspect="auto", origin="lower", cmap="viridis")
    ax.set_title("Self-Similarity Matrix")
    ax.set_xlabel("Bar Index")
    ax.set_ylabel("Bar Index")
    fig.tight_layout()
    fig.savefig(ssm_path, dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(8, 3))
    x_values = np.arange(novelty.shape[0], dtype=int)
    ax.plot(x_values, novelty, color="black", linewidth=1.5)
    for boundary_index in boundary_indices:
        ax.axvline(boundary_index, color="red", linestyle="--", linewidth=1.0, alpha=0.8)
    ax.set_title("Novelty Curve")
    ax.set_xlabel("Bar Index")
    ax.set_ylabel("Novelty")
    fig.tight_layout()
    fig.savefig(novelty_path, dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(10, 2.8))
    for section in sections:
        start = float(section.start)
        width = max(0.0, float(section.end) - start)
        ax.barh(
            y=0,
            width=width,
            left=start,
            height=0.6,
            align="center",
            alpha=0.7,
            edgecolor="black",
        )
        ax.text(start + width / 2.0, 0, str(section.index), ha="center", va="center", fontsize=9)
    total_duration = float(bars[-1][1]) if bars else 0.0
    ax.set_xlim(0.0, max(total_duration, 1.0))
    ax.set_ylim(-0.8, 0.8)
    ax.set_yticks([])
    ax.set_title("Sections")
    ax.set_xlabel("Time (s)")
    fig.tight_layout()
    fig.savefig(sections_path, dpi=150)
    plt.close(fig)
