from __future__ import annotations

from typing import Any


MIN_MACRO_SECTION_BARS = 16
LOCAL_BOUNDARY_GROUP_MAX_GAP_BARS = 8
DOMINANT_ANCHOR_SPLIT_MIN_GROUP_SIZE = 5
DOMINANT_ANCHOR_SPLIT_MIN_BOUNDARY_SCORE_GAP = 0.25


def _build_candidate_lookup(
    scored_candidates: list[dict[str, Any]],
) -> dict[int, dict[str, Any]]:
    return {
        int(candidate["bar_index"]): candidate
        for candidate in scored_candidates
        if "bar_index" in candidate and candidate["bar_index"] is not None
    }


def _split_group_on_dominant_anchor(
    group_bar_indices: list[int],
    candidate_lookup: dict[int, dict[str, Any]],
) -> list[list[int]]:
    if len(group_bar_indices) < DOMINANT_ANCHOR_SPLIT_MIN_GROUP_SIZE:
        return [group_bar_indices]

    scored_group: list[tuple[int, float]] = []

    for bar_index in group_bar_indices:
        candidate = candidate_lookup.get(bar_index)
        if not candidate:
            continue

        scored_group.append(
            (bar_index, float(candidate.get("boundary_score", 0.0)))
        )

    if len(scored_group) < 2:
        return [group_bar_indices]

    sorted_group = sorted(scored_group, key=lambda item: item[1], reverse=True)
    best_bar_index, best_score = sorted_group[0]
    second_best_score = sorted_group[1][1]
    score_gap = best_score - second_best_score

    split_index = group_bar_indices.index(best_bar_index)

    if score_gap < DOMINANT_ANCHOR_SPLIT_MIN_BOUNDARY_SCORE_GAP:
        return [group_bar_indices]

    if split_index == 0 or split_index == len(group_bar_indices) - 1:
        return [group_bar_indices]

    left_group = group_bar_indices[:split_index]
    right_group = group_bar_indices[split_index:]

    if len(left_group) < 2 or len(right_group) < 2:
        return [group_bar_indices]

    return [left_group, right_group]


def _build_local_boundary_groups(
    scored_candidates: list[dict[str, Any]],
) -> list[list[int]]:
    candidate_lookup = _build_candidate_lookup(scored_candidates)

    boundaries_with_bar_index = [
        candidate
        for candidate in scored_candidates
        if "bar_index" in candidate and candidate["bar_index"] is not None
    ]

    if not boundaries_with_bar_index:
        return []

    sorted_boundaries = sorted(
        boundaries_with_bar_index,
        key=lambda boundary: int(boundary["bar_index"]),
    )

    raw_groups: list[list[int]] = [[int(sorted_boundaries[0]["bar_index"])]]

    for boundary in sorted_boundaries[1:]:
        bar_index = int(boundary["bar_index"])
        previous_bar_index = raw_groups[-1][-1]

        if bar_index - previous_bar_index <= LOCAL_BOUNDARY_GROUP_MAX_GAP_BARS:
            raw_groups[-1].append(bar_index)
        else:
            raw_groups.append([bar_index])

    split_groups: list[list[int]] = []

    for group_bar_indices in raw_groups:
        split_groups.extend(
            _split_group_on_dominant_anchor(
                group_bar_indices=group_bar_indices,
                candidate_lookup=candidate_lookup,
            )
        )

    return split_groups


def _select_group_anchor_decision(
    group_bar_indices: list[int],
    candidate_lookup: dict[int, dict[str, Any]],
) -> dict[str, Any]:
    candidate_summaries: list[dict[str, Any]] = []

    for bar_index in group_bar_indices:
        candidate = candidate_lookup.get(bar_index, {})
        candidate_summaries.append(
            {
                "bar_index": int(bar_index),
                "boundary_score": float(candidate.get("boundary_score", 0.0)),
                "score": float(candidate.get("score", 0.0)),
                "delta_norm": float(candidate.get("delta_norm", 0.0)),
                "forward_stability": float(candidate.get("forward_stability", 0.0)),
                "similarity_prev_to_here": float(
                    candidate.get("similarity_prev_to_here", 0.0)
                ),
            }
        )

    if not candidate_summaries:
        return {
            "group_bar_indices": group_bar_indices,
            "selected_bar_index": None,
            "ignored_bar_indices": [],
            "selection_method": "highest_boundary_score",
            "candidates": [],
            "is_empty": True,
        }

    selected_candidate = max(
        candidate_summaries,
        key=lambda candidate: candidate["boundary_score"],
    )

    selected_bar_index = int(selected_candidate["bar_index"])
    ignored_bar_indices = [
        int(bar_index) for bar_index in group_bar_indices if int(bar_index) != selected_bar_index
    ]

    return {
        "group_bar_indices": [int(bar_index) for bar_index in group_bar_indices],
        "selected_bar_index": selected_bar_index,
        "ignored_bar_indices": ignored_bar_indices,
        "selection_method": "highest_boundary_score",
        "candidates": candidate_summaries,
        "is_empty": False,
    }


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


def _build_macro_sections_from_boundary_indices(
    boundary_bar_indices: list[int],
    bars: list[dict[str, float | int]],
    sections: list[dict[str, float | int]],
) -> list[dict[str, Any]]:
    if not bars:
        return []

    bar_lookup = {
        int(bar["index"]): bar
        for bar in bars
        if "index" in bar and bar["index"] is not None
    }

    if not bar_lookup:
        return []

    valid_boundary_bar_indices = sorted(
        {
            int(bar_index)
            for bar_index in boundary_bar_indices
            if int(bar_index) in bar_lookup
        }
    )

    last_bar_index = max(bar_lookup.keys())

    start_bar_indices = [0, *valid_boundary_bar_indices]
    end_bar_indices = [bar_index - 1 for bar_index in valid_boundary_bar_indices]
    end_bar_indices.append(last_bar_index)

    macro_sections: list[dict[str, Any]] = []

    for index, (start_bar_index, end_bar_index) in enumerate(
        zip(start_bar_indices, end_bar_indices)
    ):
        if start_bar_index > end_bar_index:
            continue

        start_bar = bar_lookup.get(start_bar_index)
        end_bar = bar_lookup.get(end_bar_index)

        if start_bar is None or end_bar is None:
            continue

        overlapping_source_section_indices = [
            int(section["index"])
            for section in sections
            if not (
                int(section["end_bar_index"]) < int(start_bar_index)
                or int(section["start_bar_index"]) > int(end_bar_index)
            )
        ]

        start_sec = float(start_bar["start"])
        end_sec = float(end_bar["end"])

        macro_sections.append(
            {
                "index": index,
                "start_bar_index": int(start_bar_index),
                "end_bar_index": int(end_bar_index),
                "bar_count": int(end_bar_index) - int(start_bar_index) + 1,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "duration_sec": end_sec - start_sec,
                "source_section_indices": overlapping_source_section_indices,
            }
        )

    return macro_sections


def _merge_trailing_short_macro_section(
    macro_sections: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if len(macro_sections) < 2:
        return macro_sections

    last_section = macro_sections[-1]

    if int(last_section["bar_count"]) >= MIN_MACRO_SECTION_BARS:
        return macro_sections

    previous_section = macro_sections[-2]

    merged_section = {
        "index": int(previous_section["index"]),
        "start_bar_index": int(previous_section["start_bar_index"]),
        "end_bar_index": int(last_section["end_bar_index"]),
        "bar_count": int(previous_section["bar_count"]) + int(last_section["bar_count"]),
        "start_sec": float(previous_section["start_sec"]),
        "end_sec": float(last_section["end_sec"]),
        "duration_sec": float(last_section["end_sec"]) - float(previous_section["start_sec"]),
        "source_section_indices": [
            *[int(index) for index in previous_section["source_section_indices"]],
            *[int(index) for index in last_section["source_section_indices"]],
        ],
    }

    merged_macro_sections = [*macro_sections[:-2], merged_section]

    return [
        {
            **section,
            "index": index,
        }
        for index, section in enumerate(merged_macro_sections)
    ]


def analyze_macro_sections(
    sections: list[dict[str, float | int]],
    bars: list[dict[str, float | int]],
    final_boundaries: list[dict[str, Any]],
    scored_candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    if not sections:
        return {
            "method": "greedy_min_bar_macro_sections",
            "macro_sections": [],
            "macro_section_count": 0,
            "macro_boundary_bar_indices": [],
            "ignored_boundary_bar_indices": [],
            "selected_group_anchor_bar_indices": [],
            "macro_boundary_decisions": [],
            "local_boundary_groups": [],
            "is_empty": True,
        }

    local_boundary_groups = _build_local_boundary_groups(scored_candidates)

    candidate_lookup = _build_candidate_lookup(scored_candidates)

    macro_boundary_decisions = [
        _select_group_anchor_decision(
            group_bar_indices=group_bar_indices,
            candidate_lookup=candidate_lookup,
        )
        for group_bar_indices in local_boundary_groups
    ]

    selected_group_anchor_bar_indices = [
        int(decision["selected_bar_index"])
        for decision in macro_boundary_decisions
        if decision.get("selected_bar_index") is not None
    ]

    macro_sections = _build_macro_sections_from_boundary_indices(
        boundary_bar_indices=selected_group_anchor_bar_indices,
        bars=bars,
        sections=sections,
    )
    macro_sections = _merge_trailing_short_macro_section(macro_sections)

    macro_boundary_bar_indices = [
        int(macro_section["start_bar_index"])
        for index, macro_section in enumerate(macro_sections)
        if index > 0
    ]

    final_boundary_bar_indices = [
        int(boundary["bar_index"])
        for boundary in final_boundaries
        if "bar_index" in boundary and boundary["bar_index"] is not None
    ]

    ignored_boundary_bar_indices = [
        bar_index
        for bar_index in final_boundary_bar_indices
        if bar_index not in set(macro_boundary_bar_indices)
    ]

    return {
        "method": "greedy_min_bar_macro_sections",
        "macro_sections": macro_sections,
        "macro_section_count": len(macro_sections),
        "macro_boundary_bar_indices": macro_boundary_bar_indices,
        "ignored_boundary_bar_indices": ignored_boundary_bar_indices,
        "selected_group_anchor_bar_indices": selected_group_anchor_bar_indices,
        "macro_boundary_decisions": macro_boundary_decisions,
        "local_boundary_groups": local_boundary_groups,
        "is_empty": len(macro_sections) == 0,
    }
