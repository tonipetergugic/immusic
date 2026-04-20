from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


JsonDict = dict[str, Any]
JsonList = list[dict[str, Any]]


@dataclass
class AudioFileInfo:
    path: str
    track_id: str | None
    filename: str
    stem: str
    extension: str
    sample_rate: int
    channels: int
    duration_sec: float


@dataclass
class AnalysisArtifactPaths:
    output_dir: str
    json_path: str
    report_path: str | None = None
    waveform_plot_path: str | None = None
    structure_plot_path: str | None = None


@dataclass
class StructureBar:
    index: int
    start: float
    end: float
    duration_sec: float

    def to_dict(self) -> JsonDict:
        return asdict(self)


@dataclass
class AnalysisIssue:
    code: str
    severity: str
    message: str
    details: JsonDict = field(default_factory=dict)

    def to_dict(self) -> JsonDict:
        return asdict(self)


@dataclass
class AnalysisResult:
    file_info: AudioFileInfo
    artifacts: AnalysisArtifactPaths
    summary: JsonDict = field(default_factory=dict)
    issues: JsonList = field(default_factory=list)
    structure: JsonDict = field(default_factory=dict)
    features: JsonDict = field(default_factory=dict)
    similarity: JsonDict = field(default_factory=dict)
    novelty: JsonDict = field(default_factory=dict)
    boundary_decision: JsonDict = field(default_factory=dict)
    sections: JsonDict = field(default_factory=dict)
    loudness: JsonDict = field(default_factory=dict)
    stereo: JsonDict = field(default_factory=dict)

    def to_dict(self) -> JsonDict:
        return asdict(self)
