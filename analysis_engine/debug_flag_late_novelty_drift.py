from __future__ import annotations

import json
import sys
from pathlib import Path


DELTA_THRESHOLD = 0.05
SIMILARITY_THRESHOLD = 0.95


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m analysis_engine.debug_flag_late_novelty_drift /path/to/analysis.json")
        return 1

    json_path = Path(sys.argv[1])

    if not json_path.exists():
        print(f"File not found: {json_path}")
        return 1

    with json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    candidates = data.get("novelty", {}).get("boundary_candidates", [])

    print("bar,time,score,delta,prev_sim,forward,late_novelty_drift_suspect")

    for candidate in candidates:
        delta_value = candidate.get("delta_from_prev")
        similarity_prev_value = candidate.get("similarity_prev_to_here")
        forward_value = candidate.get("forward_stability", "")
        suspect = False

        if isinstance(delta_value, (int, float)) and isinstance(similarity_prev_value, (int, float)):
            suspect = float(delta_value) < DELTA_THRESHOLD and float(similarity_prev_value) > SIMILARITY_THRESHOLD

        def fmt(value: object) -> str:
            if value == "":
                return ""
            if isinstance(value, (int, float)):
                return str(round(float(value), 4))
            return str(value)

        print(
            ",".join(
                [
                    fmt(candidate.get("bar_index", "")),
                    fmt(candidate.get("time_sec", "")),
                    fmt(candidate.get("score", "")),
                    fmt(delta_value if delta_value is not None else ""),
                    fmt(similarity_prev_value if similarity_prev_value is not None else ""),
                    fmt(forward_value),
                    "true" if suspect else "",
                ]
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
