from __future__ import annotations

from typing import Any


MIN_MACRO_SECTION_BARS = 16


def _build_macro_section(
    source_sections: list[dict[str, float | int]],
    index: int,
) -> dict[str, Any]:
    first_source_section = source_sections[0]
    last_source_section = source_sections[-1]
    start_sec = float(first_source_section["start_sec"])
    end_sec = float(last_source_section["end_sec"])

    return {
        "index": index,
        "start_bar_index": first_source_section["start_bar_index"],
        "end_bar_index": last_source_section["end_bar_index"],
        "bar_count": sum(int(section["bar_count"]) for section in source_sections),
        "start_sec": start_sec,
        "end_sec": end_sec,
        "duration_sec": end_sec - start_sec,
        "source_section_indices": [int(section["index"]) for section in source_sections],
    }


def _merge_macro_with_sections(
    macro_section: dict[str, Any],
    source_sections: list[dict[str, float | int]],
) -> dict[str, Any]:
    last_source_section = source_sections[-1]
    start_sec = float(macro_section["start_sec"])
    end_sec = float(last_source_section["end_sec"])

    return {
        "index": int(macro_section["index"]),
        "start_bar_index": int(macro_section["start_bar_index"]),
        "end_bar_index": int(last_source_section["end_bar_index"]),
        "bar_count": int(macro_section["bar_count"]) + sum(
            int(section["bar_count"]) for section in source_sections
        ),
        "start_sec": start_sec,
        "end_sec": end_sec,
        "duration_sec": end_sec - start_sec,
        "source_section_indices": [
            *[int(index) for index in macro_section["source_section_indices"]],
            *[int(section["index"]) for section in source_sections],
        ],
    }


def analyze_macro_sections(
    sections: list[dict[str, float | int]],
    bars: list[dict[str, float | int]],
) -> dict[str, Any]:
    if not sections:
        return {
            "method": "greedy_min_bar_macro_sections",
            "macro_sections": [],
            "macro_section_count": 0,
            "is_empty": True,
        }

    macro_sections: list[dict[str, Any]] = []
    current_source_sections: list[dict[str, float | int]] = []
    current_bar_count = 0

    for section in sections:
        current_source_sections.append(section)
        current_bar_count += int(section["bar_count"])

        if current_bar_count >= MIN_MACRO_SECTION_BARS:
            macro_sections.append(
                _build_macro_section(
                    source_sections=current_source_sections,
                    index=len(macro_sections),
                )
            )
            current_source_sections = []
            current_bar_count = 0

    if current_source_sections:
        if macro_sections:
            macro_sections[-1] = _merge_macro_with_sections(
                macro_section=macro_sections[-1],
                source_sections=current_source_sections,
            )
        else:
            macro_sections.append(
                _build_macro_section(
                    source_sections=current_source_sections,
                    index=0,
                )
            )

    return {
        "method": "greedy_min_bar_macro_sections",
        "macro_sections": macro_sections,
        "macro_section_count": len(macro_sections),
        "is_empty": len(macro_sections) == 0,
    }
