from __future__ import annotations

from typing import Any

from analysis_engine.schemas import StructureSegment


def build_structure_segments_from_macro_sections(
    macro_sections_payload: dict[str, Any],
) -> list[StructureSegment]:
    """
    Build clean artist-facing structure segments from the internal macro_sections payload.

    Only the minimal future contract is mapped:
    - index
    - start_sec
    - end_sec
    - start_bar
    - end_bar

    All internal/debug fields are intentionally ignored.
    """
    macro_sections = macro_sections_payload.get("macro_sections") or []
    segments: list[StructureSegment] = []

    for raw_segment in macro_sections:
        index_value = raw_segment.get("index")
        start_sec_value = raw_segment.get("start_sec")
        end_sec_value = raw_segment.get("end_sec")
        start_bar_value = raw_segment.get("start_bar_index")
        end_bar_value = raw_segment.get("end_bar_index")

        if (
            index_value is None
            or start_sec_value is None
            or end_sec_value is None
            or start_bar_value is None
            or end_bar_value is None
        ):
            continue

        segments.append(
            StructureSegment(
                index=int(index_value),
                start_sec=float(start_sec_value),
                end_sec=float(end_sec_value),
                start_bar=int(start_bar_value),
                end_bar=int(end_bar_value),
            )
        )

    return segments
