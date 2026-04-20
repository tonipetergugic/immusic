from __future__ import annotations

import json
import sys
from pathlib import Path


LATE_NOVELTY_MIN = 0.12
LATE_DELTA_MAX = 0.05
LATE_PREV_SIM_MIN = 0.95
LATE_FORWARD_MIN = 0.75

EARLY_NOVELTY_MIN = 0.25
EARLY_DELTA_MIN = 0.35
EARLY_PREV_SIM_MIN = 0.45
EARLY_FORWARD_MIN = 0.75
EARLY_FORWARD_GAIN_MIN = 0.08
EARLY_LOOKAHEAD_BARS = 3


def _fmt(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _get_float_list(data: dict, *keys: str) -> list[float]:
    current: object = data
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return []
        current = current[key]

    if not isinstance(current, list):
        return []

    result: list[float] = []
    for item in current:
        try:
            result.append(float(item))
        except (TypeError, ValueError):
            result.append(0.0)
    return result


def _classify_candidate(
    bar_index: int,
    novelty_value: float,
    delta_value: float,
    prev_sim_value: float,
    forward_value: float,
    forward_values: list[float],
) -> str:
    if (
        novelty_value >= LATE_NOVELTY_MIN
        and delta_value <= LATE_DELTA_MAX
        and prev_sim_value >= LATE_PREV_SIM_MIN
        and forward_value >= LATE_FORWARD_MIN
    ):
        return "late_novelty_drift_suspect"

    if (
        novelty_value >= EARLY_NOVELTY_MIN
        and delta_value >= EARLY_DELTA_MIN
        and prev_sim_value >= EARLY_PREV_SIM_MIN
        and forward_value >= EARLY_FORWARD_MIN
    ):
        next_window = forward_values[bar_index + 1 : bar_index + 1 + EARLY_LOOKAHEAD_BARS]
        if next_window:
            next_best_forward = max(next_window)
            if next_best_forward >= forward_value + EARLY_FORWARD_GAIN_MIN:
                return "early_peak_before_stable_arrival_suspect"

    return "normal_candidate"


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m analysis_engine.debug.debug_classify_boundary_candidates /path/to/analysis.json")
        return 1

    json_path = Path(sys.argv[1])
    data = _load_json(json_path)

    bars = data.get("structure", {}).get("bars", [])
    candidates = data.get("novelty", {}).get("boundary_candidates", [])

    novelty_values = _get_float_list(data, "novelty", "novelty_curve")
    delta_values = _get_float_list(data, "features", "bar_delta_from_prev")
    prev_sim_values = _get_float_list(data, "features", "bar_similarity_prev_to_here")
    forward_values = _get_float_list(data, "features", "bar_forward_stability")

    print("bar,time,novelty,delta,prev_sim,forward,classification")

    for candidate in candidates:
        bar_index = int(candidate.get("bar_index", -1))
        if bar_index < 0:
            continue

        time_sec = None
        if 0 <= bar_index < len(bars):
            try:
                time_sec = float(bars[bar_index].get("start", 0.0))
            except (TypeError, ValueError):
                time_sec = 0.0

        novelty_value = novelty_values[bar_index] if 0 <= bar_index < len(novelty_values) else 0.0
        delta_value = delta_values[bar_index] if 0 <= bar_index < len(delta_values) else 0.0
        prev_sim_value = prev_sim_values[bar_index] if 0 <= bar_index < len(prev_sim_values) else 0.0
        forward_value = forward_values[bar_index] if 0 <= bar_index < len(forward_values) else 0.0

        classification = _classify_candidate(
            bar_index=bar_index,
            novelty_value=novelty_value,
            delta_value=delta_value,
            prev_sim_value=prev_sim_value,
            forward_value=forward_value,
            forward_values=forward_values,
        )

        print(
            ",".join(
                [
                    _fmt(float(bar_index)),
                    _fmt(time_sec),
                    _fmt(novelty_value),
                    _fmt(delta_value),
                    _fmt(prev_sim_value),
                    _fmt(forward_value),
                    classification,
                ]
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
