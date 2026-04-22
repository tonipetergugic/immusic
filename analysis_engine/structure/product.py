from __future__ import annotations

from typing import Any

from analysis_engine.schemas import StructureMetrics
from analysis_engine.structure.contrast import compute_contrast_score
from analysis_engine.structure.repetition import compute_repetition_score
from analysis_engine.structure.segments import build_structure_segments_from_macro_sections
from analysis_engine.structure.transition import compute_transition_score


def build_structure_metrics_baseline(structure_baseline: dict[str, Any]) -> StructureMetrics:
    """
    Build the first stable artist-facing structure metrics from the internal
    baseline analysis.

    At this stage only the remaining structure timing foundation is mapped:
    - beat_count
    - downbeat_count

    `tempo_estimate` is intentionally excluded from the artist-facing
    structure contract and stays in the technical summary layer.
    """
    beat_count_value = structure_baseline.get("beat_count")
    downbeat_count_value = structure_baseline.get("downbeat_count")

    return StructureMetrics(
        beat_count=int(beat_count_value) if beat_count_value is not None else None,
        downbeat_count=int(downbeat_count_value) if downbeat_count_value is not None else None,
    )


def build_structure_metrics_with_segments(
    structure_baseline: dict[str, Any],
    macro_sections_payload: dict[str, Any],
    track_duration_sec: float | None = None,
) -> StructureMetrics:
    """
    Build structure metrics including the stable timing foundation and clean segments.

    Included at this stage:
    - beat_count
    - downbeat_count
    - segment_count
    - segments
    - repetition_score
    - contrast_score
    - transition_score

    Parked scores must not be exposed here.
    """
    metrics = build_structure_metrics_baseline(structure_baseline)
    segments = build_structure_segments_from_macro_sections(
        macro_sections_payload,
        track_duration_sec=track_duration_sec,
    )

    metrics.segments = segments
    metrics.segment_count = len(segments)

    total_bars_value = structure_baseline.get("bar_count")
    total_bars = int(total_bars_value) if total_bars_value is not None else None

    metrics.repetition_score = compute_repetition_score(
        total_bars=total_bars,
        segment_count=metrics.segment_count,
    )
    metrics.contrast_score = compute_contrast_score(macro_sections_payload)
    metrics.transition_score = compute_transition_score(macro_sections_payload)

    return metrics
