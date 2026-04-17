from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class BoundaryEvidence:
    bar_index: int
    time_sec: float
    peak_strength: float = 0.0
    state_change_strength: float = 0.0
    peak_dominance: float = 0.0
    local_contrast: float = 0.0
    persistence_after_change: float = 0.0
    neighborhood_density: float = 0.0
    candidate_class: str = "unclassified"
    confidence: float = 0.0
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def build_boundary_evidence(
    *,
    bar_index: int,
    time_sec: float,
    peak_strength: float = 0.0,
    state_change_strength: float = 0.0,
    peak_dominance: float = 0.0,
    local_contrast: float = 0.0,
    persistence_after_change: float = 0.0,
    neighborhood_density: float = 0.0,
    candidate_class: str = "unclassified",
    confidence: float = 0.0,
    reasons: list[str] | None = None,
) -> BoundaryEvidence:
    return BoundaryEvidence(
        bar_index=int(bar_index),
        time_sec=float(time_sec),
        peak_strength=float(peak_strength),
        state_change_strength=float(state_change_strength),
        peak_dominance=float(peak_dominance),
        local_contrast=float(local_contrast),
        persistence_after_change=float(persistence_after_change),
        neighborhood_density=float(neighborhood_density),
        candidate_class=str(candidate_class),
        confidence=float(confidence),
        reasons=list(reasons or []),
    )


def build_secondary_split_candidate(
    *,
    bar_index: int,
    time_sec: float,
    peak_strength: float,
    accepted: bool,
    rejection_reason: str | None,
    neighborhood_density: float = 0.0,
    local_contrast: float = 0.0,
    peak_dominance: float = 0.0,
    persistence_after_change: float = 0.0,
    state_change_strength: float = 0.0,
) -> BoundaryEvidence:
    return build_boundary_evidence(
        bar_index=bar_index,
        time_sec=time_sec,
        peak_strength=peak_strength,
        state_change_strength=state_change_strength,
        peak_dominance=peak_dominance,
        local_contrast=local_contrast,
        persistence_after_change=persistence_after_change,
        neighborhood_density=neighborhood_density,
        candidate_class="possible_section_boundary" if accepted else "ignore",
        confidence=peak_strength,
        reasons=[] if accepted else ([str(rejection_reason)] if rejection_reason else []),
    )
