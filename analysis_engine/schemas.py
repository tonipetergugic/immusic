from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Optional


@dataclass
class Bar:
    index: int
    start: float
    end: float


@dataclass
class AnalysisResult:
    track_id: Optional[str]
    duration_sec: float
    tempo_estimate: float
    beats: list[float]
    downbeats: list[float]
    bars: list[Bar]
    novelty_curve: list[float] = field(default_factory=list)
    boundary_candidates: list[float] = field(default_factory=list)
    sections: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
