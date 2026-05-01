from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from analysis_engine.artist_feedback_payload import (
    build_artist_feedback_payload_from_analysis_dict,
)


ARTIST_FEEDBACK_PAYLOAD_FILENAME = "artist_feedback_payload.json"
OUTPUT_ROOT = Path(__file__).resolve().parent / "output"


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object in {path}")

    return payload


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")


def _find_all_analysis_json_files() -> list[Path]:
    if not OUTPUT_ROOT.exists():
        return []

    return sorted(OUTPUT_ROOT.glob("*/analysis.json"))


def _write_payload_for_analysis_json(analysis_json_path: Path) -> Path:
    analysis_payload = _load_json(analysis_json_path)
    artist_feedback_payload = build_artist_feedback_payload_from_analysis_dict(
        analysis_payload
    )

    output_path = analysis_json_path.with_name(ARTIST_FEEDBACK_PAYLOAD_FILENAME)
    _write_json(output_path, artist_feedback_payload)

    return output_path


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Write artist_feedback_payload.json from existing analysis.json files."
    )
    parser.add_argument(
        "analysis_json",
        nargs="?",
        help="Path to one analysis.json file.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Backfill all analysis.json files under analysis_engine/output.",
    )

    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    if args.all and args.analysis_json:
        raise SystemExit("Use either --all or one analysis.json path, not both.")

    if not args.all and not args.analysis_json:
        raise SystemExit("Provide one analysis.json path or use --all.")

    if args.all:
        analysis_json_files = _find_all_analysis_json_files()
        if not analysis_json_files:
            raise SystemExit(f"No analysis.json files found under {OUTPUT_ROOT}")

        written_paths = [
            _write_payload_for_analysis_json(path) for path in analysis_json_files
        ]

        print(f"Wrote {len(written_paths)} artist feedback payload file(s):")
        for path in written_paths:
            print(f"- {path}")
        return

    analysis_json_path = Path(args.analysis_json).expanduser()
    if not analysis_json_path.exists():
        raise SystemExit(f"analysis.json not found: {analysis_json_path}")

    output_path = _write_payload_for_analysis_json(analysis_json_path)
    print(f"Wrote artist feedback payload: {output_path}")


if __name__ == "__main__":
    main()
