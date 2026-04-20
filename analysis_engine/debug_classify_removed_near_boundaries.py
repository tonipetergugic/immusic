from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


DEFAULT_MIN_SECTION_BARS = 8

STRONG_CLUSTER_MIN_SCORE_RATIO = 0.75
STRONG_CLUSTER_MIN_LATER_DELTA = 0.80
STRONG_CLUSTER_MAX_LATER_PREV_SIM = 0.20
STRONG_CLUSTER_MIN_LATER_FORWARD = 0.55

WEAK_DUPLICATE_MAX_LATER_DELTA = 0.30
WEAK_DUPLICATE_MIN_LATER_PREV_SIM = 0.75
WEAK_DUPLICATE_MIN_LATER_FORWARD = 0.80


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _fmt(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        return f"{value:.6f}"
    return str(value)


def _build_final_boundary_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    decision = data.get("boundary_decision", {}) or {}
    rows = decision.get("final_boundaries", []) or []

    result: list[dict[str, Any]] = []

    for item in rows:
        if not isinstance(item, dict):
            continue

        bar_index = item.get("bar_index")
        if not isinstance(bar_index, int):
            continue

        result.append(
            {
                "bar_index": bar_index,
                "start_sec": _safe_float(item.get("start_sec")),
                "score": _safe_float(item.get("score")),
                "delta_from_prev": _safe_float(item.get("delta_from_prev")),
                "similarity_prev_to_here": _safe_float(item.get("similarity_prev_to_here")),
                "forward_stability": _safe_float(item.get("forward_stability")),
            }
        )

    result.sort(key=lambda row: row["bar_index"])
    return result


def _classify_pair(earlier: dict[str, Any], later: dict[str, Any]) -> str:
    earlier_score = _safe_float(earlier.get("score"))
    later_score = _safe_float(later.get("score"))
    later_delta = _safe_float(later.get("delta_from_prev"))
    later_prev_sim = _safe_float(later.get("similarity_prev_to_here"))
    later_forward = _safe_float(later.get("forward_stability"))

    if (
        earlier_score is not None
        and later_score is not None
        and earlier_score > 0.0
        and later_delta is not None
        and later_prev_sim is not None
        and later_forward is not None
    ):
        score_ratio = later_score / earlier_score

        if (
            score_ratio >= STRONG_CLUSTER_MIN_SCORE_RATIO
            and later_delta >= STRONG_CLUSTER_MIN_LATER_DELTA
            and later_prev_sim <= STRONG_CLUSTER_MAX_LATER_PREV_SIM
            and later_forward >= STRONG_CLUSTER_MIN_LATER_FORWARD
        ):
            return "strong_cluster"

        if (
            later_delta <= WEAK_DUPLICATE_MAX_LATER_DELTA
            and later_prev_sim >= WEAK_DUPLICATE_MIN_LATER_PREV_SIM
            and later_forward >= WEAK_DUPLICATE_MIN_LATER_FORWARD
        ):
            return "weak_duplicate"

    return "unclear_near_pair"


def main() -> int:
    if len(sys.argv) not in (2, 3):
        print(
            "Usage: python -m analysis_engine.debug_classify_removed_near_boundaries "
            "<analysis.json> [min_section_bars]"
        )
        return 1

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"JSON not found: {json_path}")
        return 1

    min_section_bars = DEFAULT_MIN_SECTION_BARS
    if len(sys.argv) == 3:
        try:
            min_section_bars = int(sys.argv[2])
        except ValueError:
            print("min_section_bars must be an integer.")
            return 1

    data = _load_json(json_path)
    rows = _build_final_boundary_rows(data)

    if not rows:
        print("earlier_bar,later_bar,gap_bars,earlier_score,later_score,later_delta,later_prev_sim,later_forward,classification")
        return 0

    kept: list[dict[str, Any]] = [rows[0]]
    removed_pairs: list[tuple[dict[str, Any], dict[str, Any], int, str]] = []

    for later in rows[1:]:
        earlier = kept[-1]
        gap_bars = int(later["bar_index"]) - int(earlier["bar_index"])

        if gap_bars < min_section_bars:
            classification = _classify_pair(earlier, later)
            removed_pairs.append((earlier, later, gap_bars, classification))
            continue

        kept.append(later)

    print(
        "earlier_bar,later_bar,gap_bars,earlier_score,later_score,"
        "later_delta,later_prev_sim,later_forward,classification"
    )

    for earlier, later, gap_bars, classification in removed_pairs:
        print(
            ",".join(
                [
                    _fmt(earlier.get("bar_index")),
                    _fmt(later.get("bar_index")),
                    _fmt(gap_bars),
                    _fmt(earlier.get("score")),
                    _fmt(later.get("score")),
                    _fmt(later.get("delta_from_prev")),
                    _fmt(later.get("similarity_prev_to_here")),
                    _fmt(later.get("forward_stability")),
                    classification,
                ]
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
