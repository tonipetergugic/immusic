from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from analysis_engine.debug.debug_candidate_shift_recommendation import _choose_shift, _get_float_list


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _load_json(json_path: Path) -> dict[str, Any]:
    return json.loads(json_path.read_text(encoding="utf-8"))


def _format_time(value: float | None) -> str:
    if value is None:
        return ""
    return f"{value:.4f}"


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m analysis_engine.debug.debug_apply_boundary_shift <analysis.json>")
        return 1

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"JSON not found: {json_path}")
        return 1

    data = _load_json(json_path)

    novelty = data.get("novelty", {}) or {}
    features = data.get("features", {}) or {}
    structure = data.get("structure", {}) or {}

    novelty_curve = _get_float_list(novelty, "novelty_curve")
    delta_list = _get_float_list(features, "bar_delta_from_prev")
    forward_list = _get_float_list(features, "bar_forward_stability")
    bars = structure.get("bars", []) or []

    print("original_bar,original_time,recommendation,recommended_bar,recommended_time")

    for item in novelty.get("boundary_candidates", []) or []:
        original_bar = item.get("bar_index")
        if not isinstance(original_bar, int):
            continue

        original_time = None
        if 0 <= original_bar < len(bars):
            bar = bars[original_bar]
            if isinstance(bar, dict):
                original_time = _safe_float(bar.get("start"))

        recommendation, recommended_bar = _choose_shift(
            candidate_bar=original_bar,
            novelty_curve=novelty_curve,
            delta_list=delta_list,
            forward_list=forward_list,
        )

        recommended_time = None
        if 0 <= recommended_bar < len(bars):
            bar = bars[recommended_bar]
            if isinstance(bar, dict):
                recommended_time = _safe_float(bar.get("start"))

        print(
            f"{original_bar},"
            f"{_format_time(original_time)},"
            f"{recommendation},"
            f"{recommended_bar},"
            f"{_format_time(recommended_time)}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
