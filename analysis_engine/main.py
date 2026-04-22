from __future__ import annotations

import argparse
from pathlib import Path

from analysis_engine.audio_io import (
    load_audio_mono,
    load_audio_stereo,
    read_audio_file_info,
)
from analysis_engine.boundary_decision import analyze_boundary_decision
from analysis_engine.config import ensure_output_dir
from analysis_engine.features import analyze_features
from analysis_engine.issues import create_issue
from analysis_engine.loudness import analyze_loudness
from analysis_engine.dynamics import analyze_dynamics
from analysis_engine.low_end import analyze_low_end
from analysis_engine.macro_sections import analyze_macro_sections
from analysis_engine.novelty import analyze_novelty
from analysis_engine.plots import save_structure_plot, save_waveform_plot
from analysis_engine.report import write_analysis_json
from analysis_engine.schemas import (
    AnalysisArtifactPaths,
    AnalysisResult,
    StereoMetrics,
    SummaryMetrics,
)
from analysis_engine.sections import analyze_sections
from analysis_engine.similarity import analyze_similarity
from analysis_engine.stereo import analyze_stereo
from analysis_engine.structure.product import build_structure_metrics_with_segments
from analysis_engine.structure import analyze_structure_baseline


def build_artifact_paths(audio_path: Path) -> AnalysisArtifactPaths:
    output_root = ensure_output_dir()
    track_dir = output_root / audio_path.stem
    track_dir.mkdir(parents=True, exist_ok=True)

    return AnalysisArtifactPaths(
        output_dir=str(track_dir),
        json_path=str(track_dir / "analysis.json"),
        report_path=None,
        waveform_plot_path=str(track_dir / "waveform.png"),
        structure_plot_path=str(track_dir / "structure.png"),
    )


def build_summary(
    result: AnalysisResult,
    structure_baseline: dict[str, object],
) -> SummaryMetrics:
    tempo_value = structure_baseline.get("tempo_estimate")
    beat_count_value = structure_baseline.get("beat_count")
    downbeat_count_value = structure_baseline.get("downbeat_count")
    bar_count_value = structure_baseline.get("bar_count")

    return SummaryMetrics(
        filename=result.file_info.filename,
        duration_sec=result.file_info.duration_sec,
        sample_rate=result.file_info.sample_rate,
        channels=result.file_info.channels,
        tempo_estimate=float(tempo_value) if tempo_value is not None else None,
        beat_count=int(beat_count_value) if beat_count_value is not None else None,
        downbeat_count=int(downbeat_count_value) if downbeat_count_value is not None else None,
        bar_count=int(bar_count_value) if bar_count_value is not None else None,
    )


def run_analysis(audio_path: str, track_id: str | None = None) -> AnalysisResult:
    path = Path(audio_path).expanduser().resolve()

    file_info = read_audio_file_info(path, track_id=track_id)
    artifacts = build_artifact_paths(path)

    audio_mono, mono_sr = load_audio_mono(path)
    audio_stereo, stereo_sr = load_audio_stereo(path)

    if mono_sr != file_info.sample_rate:
        raise ValueError(f"Mono sample rate mismatch: {mono_sr} != {file_info.sample_rate}")

    if stereo_sr != file_info.sample_rate:
        raise ValueError(f"Stereo sample rate mismatch: {stereo_sr} != {file_info.sample_rate}")

    result = AnalysisResult(
        file_info=file_info,
        artifacts=artifacts,
    )

    structure_baseline = analyze_structure_baseline(audio_mono, mono_sr)
    bars = structure_baseline.get("bars", [])

    result.loudness = analyze_loudness(audio_stereo, stereo_sr)

    result.dynamics = analyze_dynamics(
        audio_stereo,
        loudness_result=result.loudness,
    )

    result.features = analyze_features(
        audio_mono,
        mono_sr,
        bars=bars,
    )
    result.similarity = analyze_similarity(
        result.features.get("bar_feature_vectors", [])
    )
    result.novelty = analyze_novelty(
        result.similarity.get("matrix", []),
        bars,
        bar_delta_from_prev=result.features.get("bar_delta_from_prev", []),
        bar_similarity_prev_to_here=result.features.get("bar_similarity_prev_to_here", []),
        bar_forward_stability=result.features.get("bar_forward_stability", []),
    )
    result.boundary_decision = analyze_boundary_decision(
        boundary_candidates=result.novelty.get("boundary_candidates", []),
        bars=bars,
    )
    sections = analyze_sections(
        bars,
        result.boundary_decision.get("final_boundaries", []),
    )
    result.sections = sections
    macro_sections = analyze_macro_sections(
        sections=sections.get("sections", []),
        bars=bars,
        final_boundaries=result.boundary_decision.get("final_boundaries", []),
        scored_candidates=result.boundary_decision.get("scored_candidates", []),
    )
    result.macro_sections = macro_sections
    result.structure = build_structure_metrics_with_segments(
        structure_baseline=structure_baseline,
        macro_sections_payload=macro_sections,
        track_duration_sec=result.file_info.duration_sec,
    )
    if audio_stereo.ndim == 2 and audio_stereo.shape[0] == 2:
        result.stereo = analyze_stereo(audio_stereo, mono_sr)
    else:
        result.stereo = StereoMetrics(
            sample_rate=int(mono_sr),
            side_mid_ratio=None,
            phase_correlation=None,
            stereo_width=None,
        )

    result.low_end = analyze_low_end(audio_stereo, stereo_sr)

    issues: list[dict[str, object]] = []

    if result.file_info.duration_sec <= 0:
        issues.append(
            create_issue(
                code="invalid_duration",
                severity="error",
                message="Audio duration is zero or negative.",
            )
        )

    if result.file_info.channels < 1:
        issues.append(
            create_issue(
                code="invalid_channel_count",
                severity="error",
                message="Audio channel count is invalid.",
            )
        )

    result.issues = issues
    result.summary = build_summary(
        result,
        structure_baseline=structure_baseline,
    )

    save_waveform_plot(audio_mono, mono_sr, result)
    save_structure_plot(audio_mono, mono_sr, result)
    write_analysis_json(result)

    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the ImMusic analysis engine on an audio file.")
    parser.add_argument("audio_path", help="Path to the input audio file")
    parser.add_argument("--track-id", dest="track_id", default=None, help="Optional track id")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = run_analysis(args.audio_path, track_id=args.track_id)

    print(f"Audio: {result.file_info.path}")
    print(f"Filename: {result.file_info.filename}")
    print(f"Duration: {result.file_info.duration_sec:.2f}s")
    print(f"Sample rate: {result.file_info.sample_rate}")
    print(f"Channels: {result.file_info.channels}")
    print(f"Tempo estimate: {result.summary.tempo_estimate}")
    print(f"Beats: {result.summary.beat_count}")
    print(f"Downbeats: {result.summary.downbeat_count}")
    print(f"Bars: {result.summary.bar_count}")
    print(f"JSON: {result.artifacts.json_path}")
    if result.artifacts.waveform_plot_path:
        print(f"Waveform plot: {result.artifacts.waveform_plot_path}")
    if result.artifacts.structure_plot_path:
        print(f"Structure plot: {result.artifacts.structure_plot_path}")


if __name__ == "__main__":
    main()
