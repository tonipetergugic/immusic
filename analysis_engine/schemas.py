from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class AnalysisResult:
    track_id: str | None
    source_path: str
    duration_sec: float
    sample_rate: int
    tempo_estimate: float | None
    beats: list[float] = field(default_factory=list)
    downbeats: list[float] = field(default_factory=list)
    bars: list[list[float]] = field(default_factory=list)
    novelty_curve: list[float] = field(default_factory=list)
    boundary_candidates: list[float] = field(default_factory=list)
    sections: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json_ready(self) -> dict[str, Any]:
        return self.to_dict()


def build_output_path(audio_path: str | Path, output_dir: str | Path) -> Path:
    audio_file = Path(audio_path)
    output_root = Path(output_dir)
    return output_root / f"{audio_file.stem}.json"
