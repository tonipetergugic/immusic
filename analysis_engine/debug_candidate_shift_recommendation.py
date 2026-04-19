from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


MAX_SHIFT = 2
MAX_LATE_DRIFT_SHIFT = 3

MIN_FORWARD_IMPROVEMENT = 0.08
MIN_DELTA_IMPROVEMENT = 0.05
MIN_NOVELTY_FLOOR_RATIO = 0.5
LATE_DRIFT_MIN_NOVELTY = 0.12
LATE_DRIFT_MAX_DELTA = 0.02
LATE_DRIFT_MIN_FORWARD = 0.80
LATE_DRIFT_TARGET_MIN_DELTA = 0.20
LATE_DRIFT_TARGET_MIN_FORWARD = 0.90


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _load_json(json_path: Path) -> dict[str, Any]:
    return json.loads(json_path.read_text(encoding="utf-8"))


def _get_float_list(container: dict[str, Any], key: str) -> list[float | None]:
    values = container.get(key, []) or []
    result: list[float | None] = []
    for value in values:
        result.append(_safe_float(value))
    return result


def _get_candidate_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    novelty = data.get("novelty", {}) or []
    features = data.get("features", {}) or []
    structure = data.get("structure", {}) or []

    novelty_curve = _get_float_list(novelty, "novelty_curve")
    delta_list = _get_float_list(features, "bar_delta_from_prev")
    prev_sim_list = _get_float_list(features, "bar_similarity_prev_to_here")
    forward_list = _get_float_list(features, "bar_forward_stability")
    bars = structure.get("bars", []) or []

    rows: list[dict[str, Any]] = []

    for item in novelty.get("boundary_candidates", []) or []:
        bar_index = item.get("bar_index")
        if not isinstance(bar_index, int):
            continue

        time_sec = None
        if 0 <= bar_index < len(bars):
            bar = bars[bar_index]
            if isinstance(bar, dict):
                time_sec = _safe_float(bar.get("start"))

        novelty_value = novelty_curve[bar_index] if 0 <= bar_index < len(novelty_curve) else None
        delta_value = delta_list[bar_index] if 0 <= bar_index < len(delta_list) else None
        prev_sim_value = prev_sim_list[bar_index] if 0 <= bar_index < len(prev_sim_list) else None
        forward_value = forward_list[bar_index] if 0 <= bar_index < len(forward_list) else None

        rows.append(
            {
                "bar_index": bar_index,
                "time_sec": time_sec,
                "novelty": novelty_value,
                "delta": delta_value,
                "prev_sim": prev_sim_value,
                "forward": forward_value,
            }
        )

    return rows


def _choose_shift(
    candidate_bar: int,
    novelty_curve: list[float | None],
    delta_list: list[float | None],
    forward_list: list[float | None],
) -> tuple[str, int]:
    current_novelty = novelty_curve[candidate_bar] if 0 <= candidate_bar < len(novelty_curve) else None
    current_delta = delta_list[candidate_bar] if 0 <= candidate_bar < len(delta_list) else None
    current_forward = forward_list[candidate_bar] if 0 <= candidate_bar < len(forward_list) else None

    if current_novelty is None or current_delta is None or current_forward is None:
        return ("stay", candidate_bar)

    best_label = "stay"
    best_bar = candidate_bar
    best_forward_gain = 0.0
    best_delta_gain = 0.0

    novelty_floor = current_novelty * MIN_NOVELTY_FLOOR_RATIO

    for shift in range(1, MAX_SHIFT + 1):
        idx = candidate_bar + shift
        if idx >= len(novelty_curve) or idx >= len(delta_list) or idx >= len(forward_list):
            continue

        shifted_novelty = novelty_curve[idx]
        shifted_delta = delta_list[idx]
        shifted_forward = forward_list[idx]

        if shifted_novelty is None or shifted_delta is None or shifted_forward is None:
            continue

        if shifted_novelty < novelty_floor:
            continue

        forward_gain = shifted_forward - current_forward
        delta_gain = shifted_delta - current_delta

        if forward_gain < MIN_FORWARD_IMPROVEMENT:
            continue

        if delta_gain < MIN_DELTA_IMPROVEMENT:
            continue

        is_better = False

        if forward_gain > best_forward_gain:
            is_better = True
        elif forward_gain == best_forward_gain and delta_gain > best_delta_gain:
            is_better = True

        if is_better:
            best_forward_gain = forward_gain
            best_delta_gain = delta_gain
            best_bar = idx
            best_label = f"shift_plus_{shift}"

    if best_label == "stay":
        is_late_drift_candidate = (
            current_novelty >= LATE_DRIFT_MIN_NOVELTY
            and current_delta <= LATE_DRIFT_MAX_DELTA
            and current_forward >= LATE_DRIFT_MIN_FORWARD
        )

        if is_late_drift_candidate:
            for shift in range(1, MAX_LATE_DRIFT_SHIFT + 1):
                idx = candidate_bar + shift
                if idx >= len(delta_list) or idx >= len(forward_list):
                    continue

                shifted_delta = delta_list[idx]
                shifted_forward = forward_list[idx]

                if shifted_delta is None or shifted_forward is None:
                    continue

                if shifted_delta < LATE_DRIFT_TARGET_MIN_DELTA:
                    continue

                if shifted_forward < LATE_DRIFT_TARGET_MIN_FORWARD:
                    continue

                return (f"shift_plus_{shift}_late_drift", idx)

    return (best_label, best_bar)


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m analysis_engine.debug_candidate_shift_recommendation <analysis.json>")
        return 1

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"JSON not found: {json_path}")
        return 1

    data = _load_json(json_path)

    novelty = data.get("novelty", {}) or {}
    features = data.get("features", {}) or {}

    novelty_curve = _get_float_list(novelty, "novelty_curve")
    delta_list = _get_float_list(features, "bar_delta_from_prev")
    forward_list = _get_float_list(features, "bar_forward_stability")

    rows = _get_candidate_rows(data)

    print("bar,time,novelty,delta,forward,recommendation,recommended_bar")

    for row in rows:
        bar_index = row["bar_index"]
        recommendation, recommended_bar = _choose_shift(
            candidate_bar=bar_index,
            novelty_curve=novelty_curve,
            delta_list=delta_list,
            forward_list=forward_list,
        )

        time_sec = row["time_sec"]
        novelty_value = row["novelty"]
        delta_value = row["delta"]
        forward_value = row["forward"]

        def fmt(value: float | None) -> str:
            if value is None:
                return ""
            return f"{value:.4f}"

        print(
            f"{bar_index},"
            f"{fmt(time_sec)},"
            f"{fmt(novelty_value)},"
            f"{fmt(delta_value)},"
            f"{fmt(forward_value)},"
            f"{recommendation},"
            f"{recommended_bar}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
