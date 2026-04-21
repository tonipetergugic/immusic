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
class LoudnessMetrics:
    sample_rate: int | None = None
    integrated_lufs: float | None = None
    loudness_range_lu: float | None = None
    true_peak_dbtp: float | None = None
    peak_dbfs: float | None = None


@dataclass
class LowEndMetrics:
    sample_rate: int | None = None
    mono_loss_low_band_percent: float | None = None
    phase_correlation_low_band: float | None = None
    low_band_balance_db: float | None = None


@dataclass
class DynamicsMetrics:
    crest_factor_db: float | None = None
    integrated_rms_dbfs: float | None = None
    plr_lu: float | None = None


@dataclass
class StereoMetrics:
    sample_rate: int | None = None
    side_mid_ratio: float | None = None
    phase_correlation: float | None = None
    stereo_width: float | None = None


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
    macro_sections: JsonDict = field(default_factory=dict)
    loudness: LoudnessMetrics = field(default_factory=LoudnessMetrics)
    dynamics: DynamicsMetrics = field(default_factory=DynamicsMetrics)
    stereo: StereoMetrics = field(default_factory=StereoMetrics)
    low_end: LowEndMetrics = field(default_factory=LowEndMetrics)

    def to_dict(self) -> JsonDict:
        return asdict(self)
