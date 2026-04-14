from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from audio_io import load_audio
from beat_grid import build_beat_grid
from schemas import AnalysisResult


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate an initial beat/bar JSON analysis.")
    parser.add_argument("audio_path", help="Path to the audio file to analyze.")
    parser.add_argument("--track-id", dest="track_id", default=None, help="Optional explicit track id.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        audio = load_audio(args.audio_path)
        beat_grid = build_beat_grid(audio.path, audio.duration_sec)

        result = AnalysisResult(
            track_id=args.track_id or audio.track_id,
            duration_sec=audio.duration_sec,
            tempo_estimate=beat_grid.tempo_estimate,
            beats=beat_grid.beats,
            downbeats=beat_grid.downbeats,
            bars=beat_grid.bars,
        )

        output_dir = Path(__file__).resolve().parent / "output"
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"{Path(audio.path).stem}.json"
        output_path.write_text(
            json.dumps(result.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        print(f"Audio: {audio.path}")
        print(f"Duration: {audio.duration_sec:.2f}s")
        print(f"Tempo estimate: {beat_grid.tempo_estimate:.2f} BPM")
        print(f"Beats: {len(beat_grid.beats)}")
        print(f"Downbeats: {len(beat_grid.downbeats)}")
        print(f"Bars: {len(beat_grid.bars)}")
        print(f"Output: {output_path}")
        return 0
    except Exception as exc:
        print(f"Analysis failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
