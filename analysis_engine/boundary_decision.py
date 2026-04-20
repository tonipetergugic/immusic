from __future__ import annotations

from typing import Any


def analyze_boundary_decision(
    boundary_candidates: list[dict[str, Any]],
    bars: list[dict[str, float | int]],
) -> dict[str, Any]:
    if not boundary_candidates or not bars:
        return {
            "method": "passthrough_boundary_decision",
            "decision_mode": "passthrough",
            "input_candidate_count": len(boundary_candidates),
            "final_boundary_count": 0,
            "final_boundaries": [],
            "is_empty": True,
        }

    bar_count = len(bars)
    seen_indices: set[int] = set()
    final_boundaries: list[dict[str, Any]] = []

    for candidate in boundary_candidates:
        raw_index = candidate.get("bar_index")
        if raw_index is None:
            continue

        bar_index = int(raw_index)

        if bar_index <= 0:
            continue

        if bar_index >= bar_count:
            continue

        if bar_index in seen_indices:
            continue

        seen_indices.add(bar_index)

        boundary = dict(candidate)
        boundary["decision"] = "keep"
        boundary["decision_source"] = "passthrough_boundary_decision"
        boundary["start_sec"] = float(bars[bar_index]["start"])

        final_boundaries.append(boundary)

    final_boundaries.sort(key=lambda item: int(item["bar_index"]))

    return {
        "method": "passthrough_boundary_decision",
        "decision_mode": "passthrough",
        "input_candidate_count": len(boundary_candidates),
        "final_boundary_count": len(final_boundaries),
        "final_boundaries": final_boundaries,
        "is_empty": len(final_boundaries) == 0,
    }
