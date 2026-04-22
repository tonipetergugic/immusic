from __future__ import annotations

from typing import Any

from analysis_engine.schemas import StructureSegment


def build_structure_segments_from_macro_sections(
    macro_sections_payload: dict[str, Any],
    track_duration_sec: float | None = None,
) -> list[StructureSegment]:
    """
    Build clean artist-facing structure segments from the internal macro_sections payload.

    Only the minimal current contract is mapped:
    - index
    - start_sec
    - end_sec
    - start_bar
    - end_bar

    Product normalization:
    - first segment always starts at 0.0
    - last segment always ends at the real track duration when provided

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

    if not segments:
        return []

    normalized_segments: list[StructureSegment] = []
    normalized_track_duration = (
        float(track_duration_sec) if track_duration_sec is not None else None
    )
    last_segment_index = len(segments) - 1

    for list_index, segment in enumerate(segments):
        start_sec = max(0.0, float(segment.start_sec))
        end_sec = float(segment.end_sec)

        if list_index == 0:
            start_sec = 0.0

        if normalized_track_duration is not None:
            start_sec = min(start_sec, normalized_track_duration)

            if list_index == last_segment_index:
                end_sec = normalized_track_duration
            else:
                end_sec = min(end_sec, normalized_track_duration)

        if end_sec < start_sec:
            end_sec = start_sec

        normalized_segments.append(
            StructureSegment(
                index=segment.index,
                start_sec=start_sec,
                end_sec=end_sec,
                start_bar=segment.start_bar,
                end_bar=segment.end_bar,
            )
        )

    return normalized_segments
