from __future__ import annotations

from typing import Any


MIN_OUTRO_GUARD_TRAILING_BARS = 16
OUTRO_GUARD_STRONG_MIN_TRAILING_BARS = 12
OUTRO_GUARD_STRONG_MIN_BOUNDARY_SCORE = 0.80
OUTRO_GUARD_STRONG_MIN_DELTA_NORM = 0.80
MAX_EARLY_ENTRY_BOUNDARY_SCORE_DROP = 0.08
MIN_EARLY_ENTRY_DELTA_NORM_GAIN = 0.20
MAX_EARLY_ENTRY_FORWARD_STABILITY_DROP = 0.10
MAX_LATE_ARRIVAL_BOUNDARY_SCORE_DROP = 0.15
MAX_LATE_ARRIVAL_DELTA_NORM_DROP = 0.15
MIN_LATE_ARRIVAL_FORWARD_STABILITY_GAIN = 0.15
MAX_WEAK_TRANSITION_BOUNDARY_SCORE = 0.55
MAX_WEAK_TRANSITION_DELTA_NORM = 0.45
MIN_WEAK_TRANSITION_SIMILARITY_PREV_TO_HERE = 0.55
START_OF_TRACK_MAX_SELECTED_BAR_INDEX = 12
START_OF_TRACK_MAX_GROUP_SPAN_BARS = 8
START_OF_TRACK_MIN_SELECTED_FORWARD_STABILITY = 0.9
START_OF_TRACK_MAX_SELECTED_DELTA_NORM = 0.55
START_OF_TRACK_MIN_LATER_BOUNDARY_SCORE = 0.6


def _build_neutral_rule_result(
    rule_name: str,
) -> dict[str, Any]:
    return {
        "rule_name": rule_name,
        "applies": False,
        "action": "keep_selected",
        "preferred_bar_index": None,
        "reason": "rule not active yet",
        "evidence": {},
    }


def _build_candidate_lookup_by_bar_index(
    candidate_summaries: list[dict[str, Any]],
) -> dict[int, dict[str, Any]]:
    return {
        int(candidate["bar_index"]): candidate
        for candidate in candidate_summaries
        if candidate.get("bar_index") is not None
    }


def _build_keep_selected_rule_result(
    *,
    rule_name: str,
    reason: str,
    evidence: dict[str, Any],
) -> dict[str, Any]:
    return {
        "rule_name": rule_name,
        "applies": False,
        "action": "keep_selected",
        "preferred_bar_index": None,
        "reason": reason,
        "evidence": evidence,
    }


def evaluate_outro_guard_rule(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    selected_bar_index = group_context.get("selected_bar_index")
    is_last_group = bool(group_context.get("is_last_group"))
    trailing_bar_count = group_context.get("trailing_bar_count")
    evidence: dict[str, Any] = {
        "selected_bar_index": selected_bar_index,
        "is_last_group": is_last_group,
        "trailing_bar_count": trailing_bar_count,
    }

    if not is_last_group:
        return {
            "rule_name": "outro_guard",
            "applies": False,
            "action": "keep_selected",
            "preferred_bar_index": None,
            "reason": "group is not the last group",
            "evidence": evidence,
        }

    if selected_bar_index is None:
        return {
            "rule_name": "outro_guard",
            "applies": False,
            "action": "keep_selected",
            "preferred_bar_index": None,
            "reason": "group has no selected anchor",
            "evidence": evidence,
        }

    if trailing_bar_count is None:
        return {
            "rule_name": "outro_guard",
            "applies": False,
            "action": "keep_selected",
            "preferred_bar_index": None,
            "reason": "trailing bar count unavailable",
            "evidence": evidence,
        }

    trailing_bar_count_int = int(trailing_bar_count)
    selected_candidate = {}
    candidate_summaries = list(group_context.get("candidate_summaries", []))
    candidate_lookup = _build_candidate_lookup_by_bar_index(candidate_summaries)
    if selected_bar_index is not None:
        selected_candidate = candidate_lookup.get(int(selected_bar_index), {})

    selected_boundary_score = float(selected_candidate.get("boundary_score", 0.0))
    selected_delta_norm = float(selected_candidate.get("delta_norm", 0.0))

    strong_outro_candidate = (
        selected_boundary_score >= OUTRO_GUARD_STRONG_MIN_BOUNDARY_SCORE
        and selected_delta_norm >= OUTRO_GUARD_STRONG_MIN_DELTA_NORM
    )

    minimum_trailing_bars = (
        OUTRO_GUARD_STRONG_MIN_TRAILING_BARS
        if strong_outro_candidate
        else MIN_OUTRO_GUARD_TRAILING_BARS
    )

    creates_too_small_trailing_block = trailing_bar_count_int < minimum_trailing_bars

    evidence["trailing_bar_count"] = trailing_bar_count_int
    evidence["minimum_trailing_bars"] = minimum_trailing_bars
    evidence["strong_outro_candidate"] = strong_outro_candidate
    evidence["selected_boundary_score"] = selected_boundary_score
    evidence["selected_delta_norm"] = selected_delta_norm
    evidence["strong_boundary_score_threshold"] = (
        OUTRO_GUARD_STRONG_MIN_BOUNDARY_SCORE
    )
    evidence["strong_delta_norm_threshold"] = OUTRO_GUARD_STRONG_MIN_DELTA_NORM
    evidence["creates_too_small_trailing_block"] = creates_too_small_trailing_block

    if not creates_too_small_trailing_block:
        return {
            "rule_name": "outro_guard",
            "applies": False,
            "action": "keep_selected",
            "preferred_bar_index": None,
            "reason": "trailing block is large enough",
            "evidence": evidence,
        }

    evidence["summary"] = "last boundary would create a trailing mini-section"

    return {
        "rule_name": "outro_guard",
        "applies": True,
        "action": "suppress_group",
        "preferred_bar_index": None,
        "reason": "last boundary would create a trailing mini-section",
        "evidence": evidence,
    }


def evaluate_weak_transition_rule(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    selected_bar_index = group_context.get("selected_bar_index")
    group_bar_indices = [
        int(bar_index)
        for bar_index in group_context.get("group_bar_indices", [])
        if bar_index is not None
    ]
    candidate_summaries = list(group_context.get("candidate_summaries", []))
    candidate_lookup = _build_candidate_lookup_by_bar_index(candidate_summaries)

    evidence: dict[str, Any] = {
        "selected_bar_index": selected_bar_index,
        "group_bar_indices": group_bar_indices,
        "max_boundary_score": MAX_WEAK_TRANSITION_BOUNDARY_SCORE,
        "max_delta_norm": MAX_WEAK_TRANSITION_DELTA_NORM,
        "min_similarity_prev_to_here": MIN_WEAK_TRANSITION_SIMILARITY_PREV_TO_HERE,
    }

    if selected_bar_index is None:
        return _build_keep_selected_rule_result(
            rule_name="weak_transition",
            reason="group has no selected anchor",
            evidence=evidence,
        )

    if len(group_bar_indices) < 2:
        return _build_keep_selected_rule_result(
            rule_name="weak_transition",
            reason="group has fewer than two candidates",
            evidence=evidence,
        )

    normalized_selected_bar_index = int(selected_bar_index)
    selected_candidate = candidate_lookup.get(normalized_selected_bar_index)

    if selected_candidate is None:
        return _build_keep_selected_rule_result(
            rule_name="weak_transition",
            reason="selected candidate summary unavailable",
            evidence=evidence,
        )

    selected_boundary_score = float(selected_candidate.get("boundary_score", 0.0))
    selected_delta_norm = float(selected_candidate.get("delta_norm", 0.0))
    selected_similarity_prev_to_here = float(
        selected_candidate.get("similarity_prev_to_here", 0.0)
    )

    boundary_score_is_weak = (
        selected_boundary_score < MAX_WEAK_TRANSITION_BOUNDARY_SCORE
    )
    delta_norm_is_weak = (
        selected_delta_norm < MAX_WEAK_TRANSITION_DELTA_NORM
    )
    similarity_prev_to_here_is_too_high = (
        selected_similarity_prev_to_here
        > MIN_WEAK_TRANSITION_SIMILARITY_PREV_TO_HERE
    )

    evidence.update(
        {
            "selected_candidate": {
                "bar_index": normalized_selected_bar_index,
                "boundary_score": selected_boundary_score,
                "delta_norm": selected_delta_norm,
                "similarity_prev_to_here": selected_similarity_prev_to_here,
            },
            "boundary_score_is_weak": boundary_score_is_weak,
            "delta_norm_is_weak": delta_norm_is_weak,
            "similarity_prev_to_here_is_too_high": (
                similarity_prev_to_here_is_too_high
            ),
        }
    )

    if not boundary_score_is_weak:
        return _build_keep_selected_rule_result(
            rule_name="weak_transition",
            reason="selected candidate has strong enough boundary score",
            evidence=evidence,
        )

    if not delta_norm_is_weak:
        return _build_keep_selected_rule_result(
            rule_name="weak_transition",
            reason="selected candidate has strong enough delta",
            evidence=evidence,
        )

    if not similarity_prev_to_here_is_too_high:
        return _build_keep_selected_rule_result(
            rule_name="weak_transition",
            reason="selected candidate is not similar enough to the previous block",
            evidence=evidence,
        )

    evidence["summary"] = (
        "group looks like weak internal movement instead of a real macro transition"
    )

    return {
        "rule_name": "weak_transition",
        "applies": True,
        "action": "suppress_group",
        "preferred_bar_index": None,
        "reason": "group looks like weak internal movement instead of a real macro transition",
        "evidence": evidence,
    }


def evaluate_early_entry_rule(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    selected_bar_index = group_context.get("selected_bar_index")
    group_bar_indices = [
        int(bar_index)
        for bar_index in group_context.get("group_bar_indices", [])
        if bar_index is not None
    ]
    candidate_summaries = list(group_context.get("candidate_summaries", []))
    candidate_lookup = _build_candidate_lookup_by_bar_index(candidate_summaries)

    evidence: dict[str, Any] = {
        "selected_bar_index": selected_bar_index,
        "group_bar_indices": group_bar_indices,
        "is_opening_group": bool(group_context.get("is_opening_group")),
        "group_index": group_context.get("group_index"),
        "group_count": group_context.get("group_count"),
        "max_boundary_score_drop": MAX_EARLY_ENTRY_BOUNDARY_SCORE_DROP,
        "min_delta_norm_gain": MIN_EARLY_ENTRY_DELTA_NORM_GAIN,
        "max_forward_stability_drop": MAX_EARLY_ENTRY_FORWARD_STABILITY_DROP,
        "opening_boundary_refinement_checked": False,
        "opening_boundary_refinement_applies": False,
    }

    if selected_bar_index is None:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="group has no selected anchor",
            evidence=evidence,
        )

    if len(group_bar_indices) < 2:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="group has fewer than two candidates",
            evidence=evidence,
        )

    normalized_selected_bar_index = int(selected_bar_index)

    if normalized_selected_bar_index not in group_bar_indices:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="selected anchor is not part of the group",
            evidence=evidence,
        )

    selected_group_position = group_bar_indices.index(normalized_selected_bar_index)

    if selected_group_position >= len(group_bar_indices) - 1:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="selected anchor has no direct later neighbor",
            evidence=evidence,
        )

    later_bar_index = int(group_bar_indices[selected_group_position + 1])
    selected_candidate = candidate_lookup.get(normalized_selected_bar_index)
    later_candidate = candidate_lookup.get(later_bar_index)

    evidence["later_bar_index"] = later_bar_index

    if selected_candidate is None:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="selected candidate summary unavailable",
            evidence=evidence,
        )

    if later_candidate is None:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="direct later candidate summary unavailable",
            evidence=evidence,
        )

    selected_boundary_score = float(selected_candidate.get("boundary_score", 0.0))
    later_boundary_score = float(later_candidate.get("boundary_score", 0.0))
    selected_delta_norm = float(selected_candidate.get("delta_norm", 0.0))
    later_delta_norm = float(later_candidate.get("delta_norm", 0.0))
    selected_forward_stability = float(
        selected_candidate.get("forward_stability", 0.0)
    )
    later_forward_stability = float(later_candidate.get("forward_stability", 0.0))

    boundary_score_drop = selected_boundary_score - later_boundary_score
    delta_norm_gain = later_delta_norm - selected_delta_norm
    forward_stability_drop = (
        selected_forward_stability - later_forward_stability
    )

    boundary_score_is_close_enough = (
        boundary_score_drop <= MAX_EARLY_ENTRY_BOUNDARY_SCORE_DROP
    )
    delta_norm_is_clearly_better = (
        delta_norm_gain >= MIN_EARLY_ENTRY_DELTA_NORM_GAIN
    )
    forward_stability_is_not_much_worse = (
        forward_stability_drop <= MAX_EARLY_ENTRY_FORWARD_STABILITY_DROP
    )

    evidence.update(
        {
            "initial_selected_bar_index": normalized_selected_bar_index,
            "preferred_bar_index": later_bar_index,
            "selected_candidate": {
                "bar_index": normalized_selected_bar_index,
                "boundary_score": selected_boundary_score,
                "delta_norm": selected_delta_norm,
                "forward_stability": selected_forward_stability,
            },
            "later_candidate": {
                "bar_index": later_bar_index,
                "boundary_score": later_boundary_score,
                "delta_norm": later_delta_norm,
                "forward_stability": later_forward_stability,
            },
            "boundary_score_drop": boundary_score_drop,
            "delta_norm_gain": delta_norm_gain,
            "forward_stability_drop": forward_stability_drop,
            "boundary_score_is_close_enough": boundary_score_is_close_enough,
            "delta_norm_is_clearly_better": delta_norm_is_clearly_better,
            "forward_stability_is_not_much_worse": (
                forward_stability_is_not_much_worse
            ),
        }
    )

    opening_boundary_refinement_applies = (
        bool(group_context.get("is_opening_group"))
        and len(group_bar_indices) >= 2
        and selected_group_position == 0
        and normalized_selected_bar_index <= START_OF_TRACK_MAX_SELECTED_BAR_INDEX
        and later_bar_index - normalized_selected_bar_index
        <= START_OF_TRACK_MAX_GROUP_SPAN_BARS
        and selected_forward_stability >= START_OF_TRACK_MIN_SELECTED_FORWARD_STABILITY
        and selected_delta_norm <= START_OF_TRACK_MAX_SELECTED_DELTA_NORM
        and later_boundary_score >= START_OF_TRACK_MIN_LATER_BOUNDARY_SCORE
    )
    evidence["opening_boundary_refinement_checked"] = True
    evidence["opening_boundary_refinement_applies"] = opening_boundary_refinement_applies

    if opening_boundary_refinement_applies:
        return {
            "rule_name": "early_entry",
            "applies": True,
            "action": "replace_with_candidate",
            "preferred_bar_index": later_bar_index,
            "reason": "opening-boundary refinement shifts opening boundary to later candidate",
            "evidence": evidence,
        }

    if not boundary_score_is_close_enough:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="direct later candidate loses too much boundary score",
            evidence=evidence,
        )

    if not delta_norm_is_clearly_better:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="direct later candidate does not improve delta strongly enough",
            evidence=evidence,
        )

    if not forward_stability_is_not_much_worse:
        return _build_keep_selected_rule_result(
            rule_name="early_entry",
            reason="direct later candidate loses too much forward stability",
            evidence=evidence,
        )

    evidence["summary"] = (
        "direct later candidate is the better entry point despite slightly lower boundary score"
    )

    return {
        "rule_name": "early_entry",
        "applies": True,
        "action": "replace_with_candidate",
        "preferred_bar_index": later_bar_index,
        "reason": "direct later candidate is the better entry point",
        "evidence": evidence,
    }


def evaluate_late_arrival_rule(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    selected_bar_index = group_context.get("selected_bar_index")
    group_bar_indices = [
        int(bar_index)
        for bar_index in group_context.get("group_bar_indices", [])
        if bar_index is not None
    ]
    candidate_summaries = list(group_context.get("candidate_summaries", []))
    candidate_lookup = _build_candidate_lookup_by_bar_index(candidate_summaries)

    evidence: dict[str, Any] = {
        "selected_bar_index": selected_bar_index,
        "group_bar_indices": group_bar_indices,
        "max_boundary_score_drop": MAX_LATE_ARRIVAL_BOUNDARY_SCORE_DROP,
        "max_delta_norm_drop": MAX_LATE_ARRIVAL_DELTA_NORM_DROP,
        "min_forward_stability_gain": MIN_LATE_ARRIVAL_FORWARD_STABILITY_GAIN,
    }

    if selected_bar_index is None:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="group has no selected anchor",
            evidence=evidence,
        )

    if len(group_bar_indices) < 2:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="group has fewer than two candidates",
            evidence=evidence,
        )

    normalized_selected_bar_index = int(selected_bar_index)

    try:
        selected_position = group_bar_indices.index(normalized_selected_bar_index)
    except ValueError:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="selected anchor not found in group",
            evidence=evidence,
        )

    if selected_position == 0:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="selected anchor has no earlier candidate",
            evidence=evidence,
        )

    earlier_bar_index = group_bar_indices[selected_position - 1]
    selected_candidate = candidate_lookup.get(normalized_selected_bar_index)
    earlier_candidate = candidate_lookup.get(int(earlier_bar_index))

    evidence["earlier_bar_index"] = int(earlier_bar_index)
    evidence["initial_selected_bar_index"] = normalized_selected_bar_index
    evidence["preferred_bar_index"] = int(earlier_bar_index)

    if selected_candidate is None or earlier_candidate is None:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="candidate summary unavailable for late-arrival comparison",
            evidence=evidence,
        )

    selected_boundary_score = float(selected_candidate.get("boundary_score", 0.0))
    selected_delta_norm = float(selected_candidate.get("delta_norm", 0.0))
    selected_forward_stability = float(
        selected_candidate.get("forward_stability", 0.0)
    )

    earlier_boundary_score = float(earlier_candidate.get("boundary_score", 0.0))
    earlier_delta_norm = float(earlier_candidate.get("delta_norm", 0.0))
    earlier_forward_stability = float(
        earlier_candidate.get("forward_stability", 0.0)
    )

    boundary_score_drop = selected_boundary_score - earlier_boundary_score
    delta_norm_drop = selected_delta_norm - earlier_delta_norm
    forward_stability_gain = (
        selected_forward_stability - earlier_forward_stability
    )

    boundary_score_is_close_enough = (
        boundary_score_drop <= MAX_LATE_ARRIVAL_BOUNDARY_SCORE_DROP
    )
    delta_norm_is_close_enough = (
        delta_norm_drop <= MAX_LATE_ARRIVAL_DELTA_NORM_DROP
    )
    forward_stability_gain_is_clear_enough = (
        forward_stability_gain >= MIN_LATE_ARRIVAL_FORWARD_STABILITY_GAIN
    )

    evidence.update(
        {
            "selected_candidate": {
                "bar_index": normalized_selected_bar_index,
                "boundary_score": selected_boundary_score,
                "delta_norm": selected_delta_norm,
                "forward_stability": selected_forward_stability,
            },
            "earlier_candidate": {
                "bar_index": int(earlier_bar_index),
                "boundary_score": earlier_boundary_score,
                "delta_norm": earlier_delta_norm,
                "forward_stability": earlier_forward_stability,
            },
            "boundary_score_drop": boundary_score_drop,
            "delta_norm_drop": delta_norm_drop,
            "forward_stability_gain": forward_stability_gain,
            "boundary_score_is_close_enough": boundary_score_is_close_enough,
            "delta_norm_is_close_enough": delta_norm_is_close_enough,
            "forward_stability_gain_is_clear_enough": (
                forward_stability_gain_is_clear_enough
            ),
        }
    )

    if not boundary_score_is_close_enough:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="earlier candidate loses too much boundary score",
            evidence=evidence,
        )

    if not delta_norm_is_close_enough:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="earlier candidate loses too much delta strength",
            evidence=evidence,
        )

    if not forward_stability_gain_is_clear_enough:
        return _build_keep_selected_rule_result(
            rule_name="late_arrival",
            reason="selected candidate does not show enough later arrival stabilization",
            evidence=evidence,
        )

    return {
        "rule_name": "late_arrival",
        "applies": True,
        "action": "replace_with_candidate",
        "preferred_bar_index": int(earlier_bar_index),
        "reason": "earlier candidate marks the entry while selected candidate looks like later full arrival",
        "evidence": evidence,
    }


def evaluate_macro_boundary_rules(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    selected_bar_index = group_context.get("selected_bar_index")

    outro_guard_result = evaluate_outro_guard_rule(group_context=group_context)
    weak_transition_result = evaluate_weak_transition_rule(group_context=group_context)
    early_entry_result = evaluate_early_entry_rule(group_context=group_context)
    late_arrival_result = evaluate_late_arrival_rule(group_context=group_context)

    rule_results = [
        outro_guard_result,
        weak_transition_result,
        early_entry_result,
        late_arrival_result,
    ]

    if outro_guard_result.get("applies") is True:
        return {
            "final_action": "suppress_group",
            "applied_rule_name": "outro_guard",
            "final_selected_bar_index": None,
            "rule_results": rule_results,
            "evidence": outro_guard_result["evidence"],
        }

    if (
        weak_transition_result.get("applies") is True
        and weak_transition_result.get("action") == "suppress_group"
    ):
        return {
            "final_action": "suppress_group",
            "applied_rule_name": "weak_transition",
            "final_selected_bar_index": None,
            "rule_results": rule_results,
            "evidence": weak_transition_result["evidence"],
        }

    if (
        early_entry_result.get("applies") is True
        and early_entry_result.get("action") == "replace_with_candidate"
    ):
        preferred_bar_index = early_entry_result.get("preferred_bar_index")
        if preferred_bar_index is not None:
            preferred_bar_index = int(preferred_bar_index)

        return {
            "final_action": "replace_with_candidate",
            "applied_rule_name": "early_entry",
            "final_selected_bar_index": preferred_bar_index,
            "rule_results": rule_results,
            "evidence": early_entry_result["evidence"],
        }

    if (
        late_arrival_result.get("applies") is True
        and late_arrival_result.get("action") == "replace_with_candidate"
    ):
        preferred_bar_index = late_arrival_result.get("preferred_bar_index")
        if preferred_bar_index is not None:
            preferred_bar_index = int(preferred_bar_index)

        return {
            "final_action": "replace_with_candidate",
            "applied_rule_name": "late_arrival",
            "final_selected_bar_index": preferred_bar_index,
            "rule_results": rule_results,
            "evidence": late_arrival_result["evidence"],
        }

    return {
        "final_action": "keep_selected",
        "applied_rule_name": None,
        "final_selected_bar_index": selected_bar_index,
        "rule_results": rule_results,
        "evidence": {},
    }
