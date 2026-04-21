from __future__ import annotations

from typing import Any


MIN_OUTRO_GUARD_TRAILING_BARS = 16


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


def evaluate_outro_guard_rule(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    selected_bar_index = group_context.get("selected_bar_index")
    is_last_group = bool(group_context.get("is_last_group"))
    trailing_bar_count = group_context.get("trailing_bar_count")

    creates_too_small_trailing_block = (
        trailing_bar_count is not None
        and int(trailing_bar_count) < MIN_OUTRO_GUARD_TRAILING_BARS
    )
    evidence: dict[str, Any] = {
        "selected_bar_index": selected_bar_index,
        "is_last_group": is_last_group,
        "trailing_bar_count": trailing_bar_count,
        "creates_too_small_trailing_block": creates_too_small_trailing_block,
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
    evidence["trailing_bar_count"] = trailing_bar_count_int
    evidence["creates_too_small_trailing_block"] = (
        trailing_bar_count_int < MIN_OUTRO_GUARD_TRAILING_BARS
    )

    if trailing_bar_count_int >= MIN_OUTRO_GUARD_TRAILING_BARS:
        return {
            "rule_name": "outro_guard",
            "applies": False,
            "action": "keep_selected",
            "preferred_bar_index": None,
            "reason": "trailing block is large enough",
            "evidence": evidence,
        }

    evidence["minimum_trailing_bars"] = MIN_OUTRO_GUARD_TRAILING_BARS
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
    del group_context
    return _build_neutral_rule_result("weak_transition")


def evaluate_early_entry_rule(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    del group_context
    return _build_neutral_rule_result("early_entry")


def evaluate_late_arrival_rule(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    del group_context
    return _build_neutral_rule_result("late_arrival")


def evaluate_macro_boundary_rules(
    *,
    group_context: dict[str, Any],
) -> dict[str, Any]:
    selected_bar_index = group_context.get("selected_bar_index")
    outro_guard_result = evaluate_outro_guard_rule(group_context=group_context)

    rule_results = [
        outro_guard_result,
        evaluate_weak_transition_rule(group_context=group_context),
        evaluate_early_entry_rule(group_context=group_context),
        evaluate_late_arrival_rule(group_context=group_context),
    ]

    if outro_guard_result.get("applies") is True:
        return {
            "final_action": "suppress_group",
            "applied_rule_name": "outro_guard",
            "final_selected_bar_index": None,
            "rule_results": rule_results,
            "evidence": outro_guard_result["evidence"],
        }

    return {
        "final_action": "keep_selected",
        "applied_rule_name": None,
        "final_selected_bar_index": selected_bar_index,
        "rule_results": rule_results,
        "evidence": {},
    }
