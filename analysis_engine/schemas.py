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
    debug_created_by_secondary_split: bool = False
    debug_parent_split_bar_index: int | None = None
    debug_parent_split_time: float | None = None


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
    change_intensity: ChangeIntensityMetrics | None = None
    stability: StabilityMetrics | None = None
    transitions: TransitionMetrics | None = None
    change_distribution: ChangeDistributionMetrics | None = None
    region_similarity: RegionSimilarityMetrics | None = None
    macro_metrics: MacroMetricsResult | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json_ready(self) -> dict[str, Any]:
        return self.to_dict()


@dataclass
class Span:
    start_bar: int
    end_bar: int
    start_time_sec: float
    end_time_sec: float
    length_bars: int
    length_sec: float
    score: float


@dataclass
class TransitionPoint:
    bar_index: int
    time_sec: float
    strength: float
    pre_region_start_bar: int
    pre_region_end_bar: int
    post_region_start_bar: int
    post_region_end_bar: int


@dataclass
class Region:
    region_id: str
    start_bar: int
    end_bar: int
    start_time_sec: float
    end_time_sec: float
    length_bars: int
    length_sec: float


@dataclass
class SimilarRegionPair:
    region_a_id: str
    region_b_id: str
    similarity_score: float


@dataclass
class RepeatedRegionGroup:
    group_id: str
    region_ids: list[str]
    group_similarity_score: float


@dataclass
class UniquenessEntry:
    region_id: str
    uniqueness_score: float


@dataclass
class ChangeIntensityMetrics:
    global_score: float
    activity_label: str
    per_bar_scores: list[float]
    smoothed_curve: list[float]
    low_change_spans: list[Span]
    high_change_spans: list[Span]


@dataclass
class StabilityMetrics:
    global_score: float
    stability_label: str
    stable_segments: list[Span]
    longest_stable_segment: Span | None
    average_stable_segment_length: float


@dataclass
class TransitionMetrics:
    global_score: float
    transition_label: str
    major_transition_points: list[TransitionPoint]
    transition_strengths: list[float]
    strongest_transition: TransitionPoint | None


@dataclass
class ChangeDistributionMetrics:
    global_score: float
    distribution_label: str
    timeline_profile: list[float]
    front_section_activity: float
    mid_section_activity: float
    end_section_activity: float
    inactive_regions: list[Span]


@dataclass
class RegionSimilarityMetrics:
    global_score: float
    similarity_label: str
    similar_region_pairs: list[SimilarRegionPair]
    repeated_region_groups: list[RepeatedRegionGroup]
    uniqueness_profile: list[UniquenessEntry]


@dataclass
class DerivedAssessment:
    repetition_degree: str
    change_density: str
    development_balance: str
    macro_state: str
    supporting_reasons: list[str]


@dataclass
class MacroMetricsResult:
    change_intensity: ChangeIntensityMetrics
    stability: StabilityMetrics
    transitions: TransitionMetrics
    change_distribution: ChangeDistributionMetrics
    region_similarity: RegionSimilarityMetrics
    derived_assessment: DerivedAssessment


def build_output_path(audio_path: str | Path, output_dir: str | Path) -> Path:
    audio_file = Path(audio_path)
    output_root = Path(output_dir)
    return output_root / f"{audio_file.stem}.json"
