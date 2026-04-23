from __future__ import annotations

from typing import Any


def _collect_final_boundary_bar_indices(
    final_boundaries: list[dict[str, Any]],
) -> list[int]:
    return [
        int(boundary["bar_index"])
        for boundary in final_boundaries
        if "bar_index" in boundary and boundary["bar_index"] is not None
    ]


def _build_macro_section(
    source_sections: list[dict[str, float | int]],
    index: int,
) -> dict[str, Any]:
    start_bar_index = int(source_sections[0]["start_bar_index"])
    end_bar_index = int(source_sections[-1]["end_bar_index"])
    start_sec = float(source_sections[0]["start_sec"])
    end_sec = float(source_sections[-1]["end_sec"])

    return {
        "index": index,
        "start_bar_index": start_bar_index,
        "end_bar_index": end_bar_index,
        "bar_count": end_bar_index - start_bar_index + 1,
        "start_sec": start_sec,
        "end_sec": end_sec,
        "duration_sec": end_sec - start_sec,
        "source_section_indices": [int(section["index"]) for section in source_sections],
    }


def _build_macro_sections_from_boundary_indices(
    boundary_bar_indices: list[int],
    sections: list[dict[str, float | int]],
) -> list[dict[str, Any]]:
    if not sections:
        return []

    if not boundary_bar_indices:
        return [_build_macro_section(sections, index=0)]

    sorted_boundaries = sorted(
        {
            int(boundary_bar_index)
            for boundary_bar_index in boundary_bar_indices
            if int(boundary_bar_index) > 0
        }
    )

    macro_sections: list[dict[str, Any]] = []
    current_macro_source_sections: list[dict[str, float | int]] = []
    next_boundary_pointer = 0

    for section in sections:
        section_start_bar_index = int(section["start_bar_index"])

        while (
            next_boundary_pointer < len(sorted_boundaries)
            and sorted_boundaries[next_boundary_pointer] < section_start_bar_index
        ):
            next_boundary_pointer += 1

        if (
            current_macro_source_sections
            and next_boundary_pointer < len(sorted_boundaries)
            and section_start_bar_index >= sorted_boundaries[next_boundary_pointer]
        ):
            macro_sections.append(
                _build_macro_section(
                    current_macro_source_sections,
                    index=len(macro_sections),
                )
            )
            current_macro_source_sections = []

        current_macro_source_sections.append(section)

    if current_macro_source_sections:
        macro_sections.append(
            _build_macro_section(
                current_macro_source_sections,
                index=len(macro_sections),
            )
        )

    return macro_sections


def build_macro_sections_payload(
    sections: list[dict[str, float | int]],
    selected_group_anchor_bar_indices: list[int],
    final_boundaries: list[dict[str, Any]],
) -> dict[str, Any]:
    macro_sections = _build_macro_sections_from_boundary_indices(
        boundary_bar_indices=selected_group_anchor_bar_indices,
        sections=sections,
    )

    macro_boundary_bar_indices = [
        int(macro_section["start_bar_index"])
        for index, macro_section in enumerate(macro_sections)
        if index > 0
    ]

    final_boundary_bar_indices = _collect_final_boundary_bar_indices(final_boundaries)

    ignored_boundary_bar_indices = [
        bar_index
        for bar_index in final_boundary_bar_indices
        if bar_index not in set(macro_boundary_bar_indices)
    ]

    return {
        "macro_sections": macro_sections,
        "macro_section_count": len(macro_sections),
        "macro_boundary_bar_indices": macro_boundary_bar_indices,
        "ignored_boundary_bar_indices": ignored_boundary_bar_indices,
        "is_empty": len(macro_sections) == 0,
    }
