from __future__ import annotations

from typing import Any


def _extract_sorted_boundary_indices(
    boundary_candidates: list[dict[str, float | int]],
    bar_count: int,
) -> list[int]:
    indices: list[int] = []

    for candidate in boundary_candidates:
        raw_index = candidate.get("bar_index")
        if raw_index is None:
            continue

        bar_index = int(raw_index)

        if bar_index <= 0:
            continue

        if bar_index >= bar_count:
            continue

        indices.append(bar_index)

    return sorted(set(indices))


def analyze_sections(
    bars: list[dict[str, float | int]],
    boundary_candidates: list[dict[str, float | int]],
    min_section_bars: int = 8,
) -> dict[str, Any]:
    if not bars:
        return {
            "method": "boundary_candidates_to_neutral_sections",
            "min_section_bars": min_section_bars,
            "min_section_bars_filter_applied": False,
            "boundary_bar_indices": [],
            "sections": [],
            "section_count": 0,
            "is_empty": True,
        }

    bar_count = len(bars)

    boundary_indices = _extract_sorted_boundary_indices(
        boundary_candidates=boundary_candidates,
        bar_count=bar_count,
    )

    # Boundary filtering is now handled upstream in boundary_decision.py.
    # Sections must translate the final productive boundary indices as-is.

    section_starts = [0, *boundary_indices]
    section_end_starts = [*boundary_indices, bar_count]

    sections: list[dict[str, float | int]] = []

    for section_index, (start_bar_index, next_start_bar_index) in enumerate(
        zip(section_starts, section_end_starts)
    ):
        end_bar_index = next_start_bar_index - 1

        if end_bar_index < start_bar_index:
            continue

        start_bar = bars[start_bar_index]
        end_bar = bars[end_bar_index]

        start_sec = 0.0 if section_index == 0 else float(start_bar["start"])
        end_sec = float(end_bar["end"])
        duration_sec = end_sec - start_sec
        section_bar_count = end_bar_index - start_bar_index + 1

        sections.append(
            {
                "index": section_index,
                "start_bar_index": start_bar_index,
                "end_bar_index": end_bar_index,
                "bar_count": section_bar_count,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "duration_sec": duration_sec,
            }
        )

    return {
        "method": "boundary_candidates_to_neutral_sections",
        "min_section_bars": min_section_bars,
        "min_section_bars_filter_applied": False,
        "boundary_bar_indices": boundary_indices,
        "sections": sections,
        "section_count": len(sections),
        "is_empty": False,
    }
