from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _load_json(json_path: Path) -> dict[str, Any]:
    return json.loads(json_path.read_text(encoding="utf-8"))


def _find_candidate_scores(boundary_candidates: list[dict[str, Any]]) -> dict[int, float]:
    result: dict[int, float] = {}
    for item in boundary_candidates:
        bar_index = item.get("bar_index")
        score = _safe_float(item.get("score"))
        if isinstance(bar_index, int) and score is not None:
            result[bar_index] = score
    return result


def _build_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    structure = data.get("structure", {})
    novelty = data.get("novelty", {})
    similarity = data.get("similarity", {})
    features = data.get("features", {})

    bars = structure.get("bars", []) or []
    novelty_curve = novelty.get("novelty_curve", []) or []
    boundary_candidates = novelty.get("boundary_candidates", []) or []
    delta_values = features.get("bar_delta_from_prev", []) or []
    similarity_prev_values = features.get("bar_similarity_prev_to_here", []) or []
    forward_stability_values = features.get("bar_forward_stability", []) or []

    candidate_scores = _find_candidate_scores(boundary_candidates)

    rows: list[dict[str, Any]] = []

    for i, bar in enumerate(bars):
        start_sec = _safe_float(bar.get("start"))
        novelty_value = _safe_float(novelty_curve[i]) if i < len(novelty_curve) else None

        delta_from_prev = _safe_float(delta_values[i]) if i < len(delta_values) else None
        similarity_prev_to_here = _safe_float(similarity_prev_values[i]) if i < len(similarity_prev_values) else None
        forward_stability = _safe_float(forward_stability_values[i]) if i < len(forward_stability_values) else None

        rows.append(
            {
                "bar_index": i,
                "start_sec": start_sec,
                "novelty": novelty_value,
                "is_candidate": i in candidate_scores,
                "candidate_score": candidate_scores.get(i),
                "delta_from_prev": delta_from_prev,
                "similarity_prev_to_here": similarity_prev_to_here,
                "forward_stability": forward_stability,
            }
        )

    return rows


def _print_section_context(sections: list[dict[str, Any]], target_bar: int) -> None:
    prev_section = None
    owner_section = None
    next_section = None

    for idx, section in enumerate(sections):
        start_bar = section.get("start_bar_index")
        end_bar = section.get("end_bar_index")
        if not isinstance(start_bar, int) or not isinstance(end_bar, int):
            continue
        if start_bar <= target_bar <= end_bar:
            owner_section = section
            if idx > 0:
                prev_section = sections[idx - 1]
            if idx + 1 < len(sections):
                next_section = sections[idx + 1]
            break

    print("SECTION CONTEXT")
    print("prev_section:", prev_section)
    print("owner_section:", owner_section)
    print("next_section:", next_section)
    print()


def _print_local_window(rows: list[dict[str, Any]], target_bar: int, radius: int = 4) -> None:
    start = max(0, target_bar - radius)
    end = min(len(rows), target_bar + radius + 1)

    print("LOCAL WINDOW")
    for row in rows[start:end]:
        formatted = {
            "bar_index": row["bar_index"],
            "start_sec": round(row["start_sec"], 3) if row["start_sec"] is not None else None,
            "novelty": round(row["novelty"], 6) if row["novelty"] is not None else None,
            "is_candidate": row["is_candidate"],
            "candidate_score": round(row["candidate_score"], 6) if row["candidate_score"] is not None else None,
            "delta_from_prev": round(row["delta_from_prev"], 6) if row["delta_from_prev"] is not None else None,
            "similarity_prev_to_here": round(row["similarity_prev_to_here"], 6) if row["similarity_prev_to_here"] is not None else None,
            "forward_stability": round(row["forward_stability"], 6) if row["forward_stability"] is not None else None,
        }
        print(formatted)
    print()


def _print_shift_compare(rows: list[dict[str, Any]], target_bar: int, max_shift: int = 3) -> None:
    print("SHIFT COMPARE")
    for shift in range(0, max_shift + 1):
        idx = target_bar + shift
        if idx >= len(rows):
            continue

        row = rows[idx]
        next_1 = rows[idx + 1] if idx + 1 < len(rows) else None
        next_2 = rows[idx + 2] if idx + 2 < len(rows) else None

        formatted = {
            "candidate_bar": idx,
            "start_sec": round(row["start_sec"], 3) if row["start_sec"] is not None else None,
            "novelty": round(row["novelty"], 6) if row["novelty"] is not None else None,
            "delta_from_prev": round(row["delta_from_prev"], 6) if row["delta_from_prev"] is not None else None,
            "similarity_prev_to_here": round(row["similarity_prev_to_here"], 6) if row["similarity_prev_to_here"] is not None else None,
            "forward_stability": round(row["forward_stability"], 6) if row["forward_stability"] is not None else None,
            "next_forward_stability": round(next_1["forward_stability"], 6) if next_1 and next_1["forward_stability"] is not None else None,
            "next_next_forward_stability": round(next_2["forward_stability"], 6) if next_2 and next_2["forward_stability"] is not None else None,
        }
        print(formatted)
    print()


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: python -m analysis_engine.debug.debug_candidate_windows <analysis.json> <target_bar> [<target_bar> ...]")
        return 1

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"JSON not found: {json_path}")
        return 1

    try:
        target_bars = [int(value) for value in sys.argv[2:]]
    except ValueError:
        print("All target_bar values must be integers.")
        return 1

    data = _load_json(json_path)
    rows = _build_rows(data)
    sections = (data.get("sections", {}) or {}).get("sections", []) or []

    for i, target_bar in enumerate(target_bars):
        if i > 0:
            print("=" * 80)

        print("=" * 80)
        print(f"TARGET BAR: {target_bar}")
        print("=" * 80)
        print()

        _print_section_context(sections, target_bar)
        _print_local_window(rows, target_bar, radius=4)
        _print_shift_compare(rows, target_bar, max_shift=3)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
