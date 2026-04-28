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
class StructureSegment:
    index: int
    start_sec: float
    end_sec: float
    start_bar: int
    end_bar: int


@dataclass
class StructureMetrics:
    """
    Current artist-facing structure contract.

    Target contract:
    {
      "beat_count": int,
      "downbeat_count": int,
      "segment_count": int,
      "segments": [
        {
          "index": int,
          "start_sec": float,
          "end_sec": float,
          "start_bar": int,
          "end_bar": int
        }
      ],
      "repetition_score": float,
      "contrast_score": float,
      "transition_score": float
    }

    Score meanings:
    - `repetition_score` describes how strongly bar-level feature material returns
      later in the track while ignoring near-neighbor continuity. It is a real
      feature-reuse score, not a pure segment-count proxy.
    - `contrast_score` describes form-based contrast across the coarse structure,
      currently derived from macro-segment size variation. It is not a timbral,
      mix, or sound-design contrast score.
    - `transition_score` describes the quality of selected coarse structural
      transitions, based on boundary strength and change strength at accepted
      macro-boundary anchors. It is not a transition count score.

    Explicit non-goals:
    - `tempo_estimate` is intentionally not part of the artist-facing structure contract.
    - Parked scores must not be exposed here.
    - Internal debug / working fields must not be added here.
    """
    beat_count: int | None = None
    downbeat_count: int | None = None
    segment_count: int | None = None
    segments: list[StructureSegment] = field(default_factory=list)
    repetition_score: float | None = None
    contrast_score: float | None = None
    transition_score: float | None = None


@dataclass
class AnalysisIssue:
    code: str
    severity: str
    message: str
    details: JsonDict = field(default_factory=dict)

    def to_dict(self) -> JsonDict:
        return asdict(self)


@dataclass
class ShortTermLufsPoint:
    t: float
    lufs_s: float | None = None


@dataclass
class ShortTermLufsSummary:
    min_lufs_s: float | None = None
    max_lufs_s: float | None = None
    avg_lufs_s: float | None = None
    p10_lufs_s: float | None = None
    p90_lufs_s: float | None = None
    dynamic_range_lu: float | None = None


@dataclass
class ShortTermLufsSeries:
    status: str = "not_available"
    window_sec: float = 3.0
    hop_sec: float = 1.0
    points: list[ShortTermLufsPoint] = field(default_factory=list)
    summary: ShortTermLufsSummary = field(default_factory=ShortTermLufsSummary)


@dataclass
class LoudnessMetrics:
    sample_rate: int | None = None
    integrated_lufs: float | None = None
    loudness_range_lu: float | None = None
    true_peak_dbtp: float | None = None
    peak_dbfs: float | None = None
    clipped_sample_count: int | None = None
    short_term_lufs_series: ShortTermLufsSeries = field(default_factory=ShortTermLufsSeries)


@dataclass
class LowEndMetrics:
    sample_rate: int | None = None
    mono_loss_low_band_percent: float | None = None
    phase_correlation_low_band: float | None = None
    low_band_balance_db: float | None = None


@dataclass
class SpectralRmsBasis:
    method: str = "stft_band_rms_dbfs"
    fft_size: int = 4096
    hop_length: int = 1024
    bands_hz: dict[str, list[float]] = field(
        default_factory=lambda: {
            "sub": [20.0, 60.0],
            "low": [60.0, 250.0],
            "mid": [250.0, 2000.0],
            "high": [2000.0, 8000.0],
            "air": [8000.0, 16000.0],
        }
    )


@dataclass
class SpectralRmsMetrics:
    status: str = "not_available"
    sub_rms_dbfs: float | None = None
    low_rms_dbfs: float | None = None
    mid_rms_dbfs: float | None = None
    high_rms_dbfs: float | None = None
    air_rms_dbfs: float | None = None
    basis: SpectralRmsBasis = field(default_factory=SpectralRmsBasis)


@dataclass
class TransientTimelineItem:
    start_sec: float
    end_sec: float
    transient_count: int
    density_per_sec: float
    mean_short_crest_db: float | None = None
    p95_short_crest_db: float | None = None


@dataclass
class TransientsBasis:
    method: str | None = None
    window_sec: float | None = None
    hop_sec: float | None = None
    peak_pick_delta: float | None = None


@dataclass
class TransientsMetrics:
    status: str = "not_available"
    attack_strength: float | None = None
    transient_density_per_sec: float | None = None
    mean_short_crest_db: float | None = None
    p95_short_crest_db: float | None = None
    transient_density_cv: float | None = None
    timeline: list[TransientTimelineItem] = field(default_factory=list)
    basis: TransientsBasis = field(default_factory=TransientsBasis)


@dataclass
class DynamicsMetrics:
    crest_factor_db: float | None = None
    integrated_rms_dbfs: float | None = None
    plr_lu: float | None = None


@dataclass
class LimiterStressTimelineItem:
    start_sec: float
    end_sec: float
    stress_event_count: int
    max_peak_dbtp: float | None = None
    risk: str = "low"


@dataclass
class LimiterStressBasis:
    window_sec: float = 10.0
    event_frame_sec: float = 0.1
    stress_threshold_dbtp: float = -1.0
    critical_threshold_dbtp: float = -0.2
    peak_method: str = "sample_peak_dbfs_per_100ms_frame"


@dataclass
class LimiterStressMetrics:
    status: str = "not_available"
    events_per_min: float | None = None
    max_events_per_10s: int | None = None
    p95_events_per_10s: int | None = None
    timeline: list[LimiterStressTimelineItem] = field(default_factory=list)
    basis: LimiterStressBasis = field(default_factory=LimiterStressBasis)


@dataclass
class StereoMetrics:
    sample_rate: int | None = None
    side_mid_ratio: float | None = None
    phase_correlation: float | None = None
    stereo_width: float | None = None


@dataclass
class SummaryMetrics:
    filename: str | None = None
    duration_sec: float | None = None
    sample_rate: int | None = None
    channels: int | None = None
    tempo_estimate: float | None = None
    beat_count: int | None = None
    downbeat_count: int | None = None
    bar_count: int | None = None


@dataclass
class AnalysisResult:
    # These fields are the current stable root contract of the analysis output.
    file_info: AudioFileInfo
    artifacts: AnalysisArtifactPaths
    summary: SummaryMetrics = field(default_factory=SummaryMetrics)
    issues: JsonList = field(default_factory=list)
    product_payload: JsonDict = field(default_factory=dict)
    consultant_input: JsonDict = field(default_factory=dict)
    # These fields are internal working/debug blocks and are intentionally not treated as stable product contracts yet.
    structure: StructureMetrics = field(default_factory=StructureMetrics)
    features: JsonDict = field(default_factory=dict)
    similarity: JsonDict = field(default_factory=dict)
    novelty: JsonDict = field(default_factory=dict)
    boundary_decision: JsonDict = field(default_factory=dict)
    sections: JsonDict = field(default_factory=dict)
    macro_sections: JsonDict = field(default_factory=dict)
    fusion: JsonDict = field(default_factory=dict)
    micro: JsonDict = field(default_factory=dict)
    loudness: LoudnessMetrics = field(default_factory=LoudnessMetrics)
    dynamics: DynamicsMetrics = field(default_factory=DynamicsMetrics)
    stereo: StereoMetrics = field(default_factory=StereoMetrics)
    low_end: LowEndMetrics = field(default_factory=LowEndMetrics)
    limiter_stress: LimiterStressMetrics = field(default_factory=LimiterStressMetrics)
    spectral_rms: SpectralRmsMetrics = field(default_factory=SpectralRmsMetrics)
    transients: TransientsMetrics = field(default_factory=TransientsMetrics)

    def to_dict(self) -> JsonDict:
        return asdict(self)
