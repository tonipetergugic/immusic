from __future__ import annotations

from typing import Any

from analysis_engine.macro_boundary_rules import evaluate_macro_boundary_rules


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
    *,
    group_index: int,
    group_count: int,
    is_last_group: bool,
    track_end_bar_index: int,
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

    normalized_group_bar_indices = [int(bar_index) for bar_index in group_bar_indices]

    if not candidate_summaries:
        return {
            "group_bar_indices": normalized_group_bar_indices,
            "selected_bar_index": None,
            "final_selected_bar_index": None,
            "initial_selected_bar_index": None,
            "ignored_bar_indices": [],
            "selection_method": "highest_boundary_score",
            "final_action": "keep_selected",
            "applied_rule_name": None,
            "rule_results": [],
            "evidence": {},
            "candidates": [],
            "is_empty": True,
        }

    selected_candidate = max(
        candidate_summaries,
        key=lambda candidate: candidate["boundary_score"],
    )

    initial_selected_bar_index = int(selected_candidate["bar_index"])
    trailing_bar_count = track_end_bar_index - initial_selected_bar_index

    group_context = {
        "group_bar_indices": normalized_group_bar_indices,
        "selected_bar_index": initial_selected_bar_index,
        "candidate_summaries": candidate_summaries,
        "group_index": group_index,
        "group_count": group_count,
        "is_opening_group": group_index == 0,
        "is_last_group": is_last_group,
        "bars_to_track_end": trailing_bar_count,
        "track_end_bar_index": track_end_bar_index,
        "trailing_bar_count": trailing_bar_count,
    }

    rule_decision = evaluate_macro_boundary_rules(group_context=group_context)

    final_selected_bar_index = rule_decision.get("final_selected_bar_index")
    if final_selected_bar_index is not None:
        final_selected_bar_index = int(final_selected_bar_index)

    selected_bar_index = final_selected_bar_index

    ignored_bar_indices = [
        int(bar_index)
        for bar_index in normalized_group_bar_indices
        if selected_bar_index is None or int(bar_index) != selected_bar_index
    ]

    return {
        "group_bar_indices": normalized_group_bar_indices,
        "selected_bar_index": selected_bar_index,
        "final_selected_bar_index": final_selected_bar_index,
        "initial_selected_bar_index": initial_selected_bar_index,
        "ignored_bar_indices": ignored_bar_indices,
        "selection_method": "highest_boundary_score",
        "final_action": str(rule_decision.get("final_action", "keep_selected")),
        "applied_rule_name": rule_decision.get("applied_rule_name"),
        "rule_results": list(rule_decision.get("rule_results", [])),
        "evidence": dict(rule_decision.get("evidence", {})),
        "candidates": candidate_summaries,
        "is_empty": False,
    }


def analyze_macro_boundary_decisions(
    scored_candidates: list[dict[str, Any]],
    *,
    track_end_bar_index: int,
) -> dict[str, Any]:
    local_boundary_groups = _build_local_boundary_groups(scored_candidates)
    candidate_lookup = _build_candidate_lookup(scored_candidates)

    macro_boundary_decisions = []

    for group_index, group_bar_indices in enumerate(local_boundary_groups):
        macro_boundary_decisions.append(
            _select_group_anchor_decision(
                group_bar_indices=group_bar_indices,
                candidate_lookup=candidate_lookup,
                group_index=group_index,
                group_count=len(local_boundary_groups),
                is_last_group=group_index == len(local_boundary_groups) - 1,
                track_end_bar_index=track_end_bar_index,
            )
        )

    selected_group_anchor_bar_indices = [
        int(decision["selected_bar_index"])
        for decision in macro_boundary_decisions
        if decision.get("selected_bar_index") is not None
    ]

    return {
        "local_boundary_groups": local_boundary_groups,
        "macro_boundary_decisions": macro_boundary_decisions,
        "selected_group_anchor_bar_indices": selected_group_anchor_bar_indices,
    }
