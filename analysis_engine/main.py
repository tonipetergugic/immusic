from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from audio_io import compute_rms, get_duration_seconds, load_audio_mono, slice_audio_by_seconds
from beat_grid import build_beat_grid
from debug_plot import write_debug_plots
from features import extract_bar_features
from novelty import compute_novelty_curve, detect_boundary_candidates
from sections import build_sections
from similarity import compute_self_similarity_matrix
from schemas import AnalysisResult


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate an initial beat/bar JSON analysis.")
    parser.add_argument("audio_path", help="Path to the audio file to analyze.")
    parser.add_argument("--track-id", dest="track_id", default=None, help="Optional explicit track id.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        audio_path = Path(args.audio_path).expanduser().resolve()
        samples, sample_rate = load_audio_mono(audio_path)
        duration_sec = get_duration_seconds(audio_path)
        beat_grid = build_beat_grid(audio_path.as_posix(), duration_sec)
        bars = [[float(bar.start), float(bar.end)] for bar in beat_grid.bars]
        feature_names, bar_feature_vectors = extract_bar_features(samples, sample_rate, bars)
        self_similarity_matrix = compute_self_similarity_matrix(bar_feature_vectors)
        novelty_curve = compute_novelty_curve(self_similarity_matrix)
        boundary_candidate_indices = detect_boundary_candidates(novelty_curve)
        boundary_candidates = [
            float(bars[index][0])
            for index in boundary_candidate_indices
            if 0 <= index < len(bars)
        ]
        sections = build_sections(
            bars,
            boundary_candidates,
            duration_sec,
            novelty_curve=novelty_curve,
            feature_names=feature_names,
            bar_feature_vectors=bar_feature_vectors,
        )

        result = AnalysisResult(
            track_id=args.track_id,
            source_path=audio_path.as_posix(),
            duration_sec=duration_sec,
            sample_rate=sample_rate,
            tempo_estimate=beat_grid.tempo_estimate,
            beats=beat_grid.beats,
            downbeats=beat_grid.downbeats,
            bars=bars,
            feature_names=feature_names,
            bar_feature_vectors=bar_feature_vectors,
            self_similarity_matrix=self_similarity_matrix,
            novelty_curve=novelty_curve,
            boundary_candidates=boundary_candidates,
            sections=sections,
        )

        output_dir = Path(__file__).resolve().parent / "output"
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{audio_path.stem}.json"
        output_path.write_text(
            json.dumps(result.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        write_debug_plots(
            output_dir=output_dir,
            trackname=audio_path.stem,
            self_similarity_matrix=self_similarity_matrix,
            novelty_curve=novelty_curve,
            boundary_candidates=boundary_candidates,
            bars=bars,
            sections=sections,
        )

        print(f"Audio: {audio_path}")
        print(f"Duration: {duration_sec:.2f}s")
        print(f"Tempo estimate: {beat_grid.tempo_estimate:.2f} BPM")
        print(f"Beats: {len(beat_grid.beats)}")
        print(f"Downbeats: {len(beat_grid.downbeats)}")
        print(f"Bars: {len(beat_grid.bars)}")
        print(f"Median bar duration: {beat_grid.median_bar_duration:.2f}s")
        print(f"Last bar duration: {beat_grid.last_bar_duration:.2f}s")
        print(f"Last 4 bar durations: {[round(value, 2) for value in beat_grid.last_4_bar_durations]}")
        print(f"Last 8 bar durations: {[round(value, 2) for value in beat_grid.last_8_bar_durations]}")
        print(f"Uncovered tail: {beat_grid.uncovered_tail_sec:.2f}s")
        tail_start_sec = max(0.0, result.duration_sec - beat_grid.uncovered_tail_sec)
        tail_end_sec = result.duration_sec
        analysis_window_sec = min(8.0, result.duration_sec)
        ref_start_sec = max(0.0, result.duration_sec - analysis_window_sec - beat_grid.uncovered_tail_sec)
        ref_end_sec = max(ref_start_sec, result.duration_sec - beat_grid.uncovered_tail_sec)

        tail_audio = slice_audio_by_seconds(samples, sample_rate, tail_start_sec, tail_end_sec)
        ref_audio = slice_audio_by_seconds(samples, sample_rate, ref_start_sec, ref_end_sec)

        tail_rms = compute_rms(tail_audio)
        ref_rms = compute_rms(ref_audio)
        tail_ratio = tail_rms / ref_rms if ref_rms > 0 else 0.0

        print(f"Tail RMS: {tail_rms:.6f}")
        print(f"Reference RMS: {ref_rms:.6f}")
        print(f"Tail/Reference ratio: {tail_ratio:.3f}")
        print(f"Novelty points: {len(novelty_curve)}")
        print(f"Boundary candidates: {len(boundary_candidates)}")
        print(f"Output: {output_path}")
        return 0
    except Exception as exc:
        print(f"Analysis failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
