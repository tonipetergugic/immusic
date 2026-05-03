from __future__ import annotations

from typing import Any, Mapping

from analysis_engine.consultant_input import build_consultant_input
from analysis_engine.product_payload import build_product_payload
from analysis_engine.schemas import (
    AnalysisArtifactPaths,
    AnalysisResult,
    AudioFileInfo,
    LimiterStressMetrics,
    LimiterStressTimelineItem,
    ShortTermLufsPoint,
    SpectralRmsMetrics,
    StructureSegment,
    TransientTimelineItem,
    TransientsMetrics,
)


EXTENDED_TECHNICAL_METRIC_BLOCKS = (
    "limiter_stress",
    "spectral_rms",
    "transients",
)

FORBIDDEN_CONSULTANT_SERIES_FIELDS = (
    "timeline",
    "points",
    "series",
)


def _as_dict(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, Mapping) else {}


def _fixture_result() -> AnalysisResult:
    result = AnalysisResult(
        file_info=AudioFileInfo(
            path="fixtures/extended_technical_metrics.wav",
            track_id="extended-technical-metrics",
            filename="extended_technical_metrics.wav",
            stem="extended_technical_metrics",
            extension=".wav",
            sample_rate=44_100,
            channels=2,
            duration_sec=120.0,
        ),
        artifacts=AnalysisArtifactPaths(
            output_dir="analysis_engine/output/extended-technical-metrics",
            json_path="analysis_engine/output/extended-technical-metrics/analysis.json",
        ),
    )
    result.structure.segment_count = 2
    result.structure.segments = [
        StructureSegment(
            index=0,
            start_sec=0.0,
            end_sec=60.0,
            start_bar=1,
            end_bar=32,
        ),
        StructureSegment(
            index=1,
            start_sec=60.0,
            end_sec=120.0,
            start_bar=33,
            end_bar=64,
        ),
    ]
    result.structure.repetition_score = 0.42
    result.structure.contrast_score = 0.58
    result.structure.transition_score = 0.66

    result.loudness.integrated_lufs = -9.8
    result.loudness.loudness_range_lu = 5.2
    result.loudness.true_peak_dbtp = -0.7
    result.loudness.peak_dbfs = -0.9
    result.loudness.short_term_lufs_series.status = "available"
    result.loudness.short_term_lufs_series.points = [
        ShortTermLufsPoint(t=float(index * 10), lufs_s=-12.0 + index)
        for index in range(6)
    ]
    result.loudness.short_term_lufs_series.summary.dynamic_range_lu = 4.5

    result.limiter_stress = LimiterStressMetrics(
        status="available",
        events_per_min=3.2,
        max_events_per_10s=4,
        p95_events_per_10s=3,
        timeline=[
            LimiterStressTimelineItem(
                start_sec=10.0,
                end_sec=20.0,
                stress_event_count=4,
                max_peak_dbtp=-0.1,
                risk="high",
            )
        ],
    )
    result.spectral_rms = SpectralRmsMetrics(
        status="available",
        sub_rms_dbfs=-32.1,
        low_rms_dbfs=-24.2,
        mid_rms_dbfs=-21.3,
        high_rms_dbfs=-26.4,
        air_rms_dbfs=-34.5,
    )
    result.transients = TransientsMetrics(
        status="available",
        attack_strength=0.72,
        transient_density_per_sec=1.8,
        mean_short_crest_db=8.4,
        p95_short_crest_db=13.2,
        transient_density_cv=0.29,
        timeline=[
            TransientTimelineItem(
                start_sec=20.0,
                end_sec=30.0,
                transient_count=18,
                density_per_sec=1.8,
                mean_short_crest_db=8.4,
                p95_short_crest_db=13.2,
            )
        ],
    )
    return result


def _find_forbidden_keys(value: Any, path: str) -> list[str]:
    if isinstance(value, Mapping):
        found: list[str] = []
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in FORBIDDEN_CONSULTANT_SERIES_FIELDS:
                found.append(child_path)
            found.extend(_find_forbidden_keys(child, child_path))
        return found

    if isinstance(value, list):
        found = []
        for index, child in enumerate(value):
            found.extend(_find_forbidden_keys(child, f"{path}[{index}]"))
        return found

    return []


def audit_product_consultant_exports() -> list[str]:
    errors: list[str] = []
    result = _fixture_result()

    product_payload = build_product_payload(result)
    result.product_payload = product_payload
    consultant_input = build_consultant_input(result)

    product_technical_metrics = _as_dict(product_payload.get("technical_metrics"))
    consultant_technical_metrics = _as_dict(consultant_input.get("technical_metrics"))

    for block_name in EXTENDED_TECHNICAL_METRIC_BLOCKS:
        product_block = product_technical_metrics.get(block_name)
        if not isinstance(product_block, Mapping):
            errors.append(f"product_payload.technical_metrics missing {block_name}")

        consultant_block = consultant_technical_metrics.get(block_name)
        if not isinstance(consultant_block, Mapping):
            errors.append(f"consultant_input.technical_metrics missing {block_name}")
            continue

        forbidden_paths = _find_forbidden_keys(
            consultant_block,
            f"consultant_input.technical_metrics.{block_name}",
        )
        for forbidden_path in forbidden_paths:
            errors.append(f"consultant_input exported long series field: {forbidden_path}")

    return errors


def main() -> None:
    errors = audit_product_consultant_exports()

    if errors:
        print("Product/Consultant Export Audit FAILED")
        print("======================================")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("Product/Consultant Export Audit")
    print("===============================")
    print("Extended technical metric exports OK.")


if __name__ == "__main__":
    main()
