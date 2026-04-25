from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from artist_decision_payload import build_artist_decision_payload


DEFAULT_OUTPUT_FILENAME = "artist_decision_payload.json"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build an artist_decision_payload.json from an analysis.json file."
    )
    parser.add_argument(
        "analysis_json",
        help="Path to an existing analysis.json file.",
    )
    parser.add_argument(
        "--output",
        help="Optional output path. Defaults to artist_decision_payload.json next to analysis.json.",
    )

    args = parser.parse_args()

    input_path = Path(args.analysis_json).expanduser().resolve()

    if not input_path.exists():
        raise SystemExit(f"Input file does not exist: {input_path}")

    if not input_path.is_file():
        raise SystemExit(f"Input path is not a file: {input_path}")

    with input_path.open("r", encoding="utf-8") as file:
        analysis: dict[str, Any] = json.load(file)

    payload = build_artist_decision_payload(analysis)

    if args.output:
        output_path = Path(args.output).expanduser().resolve()
    else:
        output_path = input_path.with_name(DEFAULT_OUTPUT_FILENAME)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")
    print(f"Release readiness: {payload['release_readiness']['label']}")
    print(f"Next step: {payload['next_step']['title']}")


if __name__ == "__main__":
    main()
