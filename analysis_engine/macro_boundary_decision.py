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
    group_candidate_count = len(normalized_group_bar_indices)
    group_span_bars = (
        max(normalized_group_bar_indices) - min(normalized_group_bar_indices)
        if normalized_group_bar_indices
        else 0
    )

    if not candidate_summaries:
        return {
            "group_bar_indices": normalized_group_bar_indices,
            "selected_bar_index": None,
            "final_selected_bar_index": None,
            "initial_selected_bar_index": None,
            "initial_anchor_bar_index": None,
            "final_anchor_bar_index": None,
            "anchor_changed": False,
            "ignored_bar_indices": [],
            "ignored_group_bar_indices": [],
            "group_span_bars": group_span_bars,
            "group_candidate_count": group_candidate_count,
            "group_form": "isolated_anchor",
            "retained_anchor_tendency": None,
            "final_anchor_boundary_score": None,
            "max_ignored_boundary_score": None,
            "anchor_score_dominance": None,
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

    final_anchor_boundary_score = None
    max_ignored_boundary_score = None
    anchor_score_dominance = None

    is_retained_anchor_with_ignored_neighbors = (
        final_selected_bar_index is not None
        and initial_selected_bar_index == final_selected_bar_index
        and rule_decision.get("applied_rule_name") is None
        and len(ignored_bar_indices) > 0
    )

    if is_retained_anchor_with_ignored_neighbors:
        candidate_by_bar_index = {
            int(candidate["bar_index"]): candidate
            for candidate in candidate_summaries
            if candidate.get("bar_index") is not None
        }

        final_anchor_candidate = candidate_by_bar_index.get(final_selected_bar_index)
        ignored_candidates = [
            candidate_by_bar_index[bar_index]
            for bar_index in ignored_bar_indices
            if bar_index in candidate_by_bar_index
        ]

        if (
            final_anchor_candidate is not None
            and final_anchor_candidate.get("boundary_score") is not None
        ):
            final_anchor_boundary_score = float(final_anchor_candidate["boundary_score"])

            ignored_boundary_scores = [
                float(candidate["boundary_score"])
                for candidate in ignored_candidates
                if candidate.get("boundary_score") is not None
            ]

            if ignored_boundary_scores:
                max_ignored_boundary_score = max(ignored_boundary_scores)
                anchor_score_dominance = (
                    final_anchor_boundary_score - max_ignored_boundary_score
                )

    anchor_changed = initial_selected_bar_index != final_selected_bar_index

    if final_selected_bar_index is None and anchor_changed:
        group_form = "suppressed_group"
    elif (
        final_selected_bar_index is not None
        and anchor_changed
        and rule_decision.get("applied_rule_name") is not None
    ):
        group_form = "rule_shifted_anchor"
    elif (
        final_selected_bar_index is not None
        and not anchor_changed
        and len(ignored_bar_indices) > 0
        and rule_decision.get("applied_rule_name") is None
    ):
        group_form = "retained_anchor_with_ignored_neighbors"
    else:
        group_form = "isolated_anchor"

    retained_anchor_tendency = None

    if group_form == "retained_anchor_with_ignored_neighbors":
        if (
            anchor_score_dominance is not None
            and anchor_score_dominance >= 0.35
            and group_span_bars <= 8
            and group_candidate_count <= 3
        ):
            retained_anchor_tendency = "duplicate_leaning"
        elif (
            (
                anchor_score_dominance is not None
                and anchor_score_dominance <= 0.18
                and group_span_bars >= 8
            )
            or group_candidate_count >= 4
            or group_span_bars >= 20
        ):
            retained_anchor_tendency = "cluster_leaning"
        else:
            retained_anchor_tendency = "mixed"

    return {
        "group_bar_indices": normalized_group_bar_indices,
        "selected_bar_index": selected_bar_index,
        "final_selected_bar_index": final_selected_bar_index,
        "initial_selected_bar_index": initial_selected_bar_index,
        "initial_anchor_bar_index": initial_selected_bar_index,
        "final_anchor_bar_index": final_selected_bar_index,
        "anchor_changed": anchor_changed,
        "ignored_bar_indices": ignored_bar_indices,
        "ignored_group_bar_indices": ignored_bar_indices,
        "group_span_bars": group_span_bars,
        "group_candidate_count": group_candidate_count,
        "group_form": group_form,
        "retained_anchor_tendency": retained_anchor_tendency,
        "final_anchor_boundary_score": final_anchor_boundary_score,
        "max_ignored_boundary_score": max_ignored_boundary_score,
        "anchor_score_dominance": anchor_score_dominance,
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
