from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Bar:
    index: int
    start: float
    end: float


@dataclass
class Section:
    index: int
    start: float
    end: float
    start_bar_index: int
    end_bar_index: int
    duration_sec: float
    debug_is_long_section_candidate: bool = False
    debug_internal_peak_bar_indices: list[int] = field(default_factory=list)
    debug_internal_peak_times: list[float] = field(default_factory=list)
    debug_split_applied: bool = False
    debug_candidate_evaluations: list[dict[str, Any]] = field(default_factory=list)
    debug_split_rejection_reason: str | None = None


@dataclass
class AnalysisResult:
    track_id: str | None
    source_path: str
    duration_sec: float
    sample_rate: int
    tempo_estimate: float | None
    beats: list[float] = field(default_factory=list)
    downbeats: list[float] = field(default_factory=list)
    bars: list[Bar] = field(default_factory=list)
    feature_names: list[str] = field(default_factory=list)
    bar_feature_vectors: list[list[float]] = field(default_factory=list)
    self_similarity_matrix: list[list[float]] = field(default_factory=list)
    novelty_curve: list[float] = field(default_factory=list)
    boundary_candidates: list[float] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json_ready(self) -> dict[str, Any]:
        return self.to_dict()


def build_output_path(audio_path: str | Path, output_dir: str | Path) -> Path:
    audio_file = Path(audio_path)
    output_root = Path(output_dir)
    return output_root / f"{audio_file.stem}.json"
