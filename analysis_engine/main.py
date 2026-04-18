from __future__ import annotations

import argparse
from pathlib import Path

from analysis_engine.audio_io import (
    load_audio_mono,
    load_audio_stereo,
    read_audio_file_info,
)
from analysis_engine.config import ensure_output_dir
from analysis_engine.features import analyze_features
from analysis_engine.issues import create_issue
from analysis_engine.loudness import analyze_loudness
from analysis_engine.plots import save_waveform_plot
from analysis_engine.report import write_analysis_json
from analysis_engine.schemas import AnalysisArtifactPaths, AnalysisResult
from analysis_engine.stereo import analyze_stereo
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
        structure_plot_path=None,
    )


def build_summary(result: AnalysisResult) -> dict[str, object]:
    structure = result.structure
    return {
        "filename": result.file_info.filename,
        "duration_sec": result.file_info.duration_sec,
        "sample_rate": result.file_info.sample_rate,
        "channels": result.file_info.channels,
        "tempo_estimate": structure.get("tempo_estimate"),
        "beat_count": structure.get("beat_count"),
        "downbeat_count": structure.get("downbeat_count"),
        "bar_count": structure.get("bar_count"),
    }


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

    result.structure = analyze_structure_baseline(audio_mono, mono_sr)
    result.features = analyze_features(audio_mono, mono_sr)
    result.loudness = analyze_loudness(audio_mono, mono_sr)
    result.stereo = analyze_stereo(audio_stereo, mono_sr)

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
    result.summary = build_summary(result)

    save_waveform_plot(audio_mono, mono_sr, result)
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
    print(f"Tempo estimate: {result.summary.get('tempo_estimate')}")
    print(f"Beats: {result.summary.get('beat_count')}")
    print(f"Downbeats: {result.summary.get('downbeat_count')}")
    print(f"Bars: {result.summary.get('bar_count')}")
    print(f"JSON: {result.artifacts.json_path}")
    if result.artifacts.waveform_plot_path:
        print(f"Waveform plot: {result.artifacts.waveform_plot_path}")


if __name__ == "__main__":
    main()
