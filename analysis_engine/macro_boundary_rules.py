from __future__ import annotations

from typing import Any


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
    del group_context
    return _build_neutral_rule_result("outro_guard")


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

    rule_results = [
        evaluate_outro_guard_rule(group_context=group_context),
        evaluate_weak_transition_rule(group_context=group_context),
        evaluate_early_entry_rule(group_context=group_context),
        evaluate_late_arrival_rule(group_context=group_context),
    ]

    return {
        "final_action": "keep_selected",
        "applied_rule_name": None,
        "final_selected_bar_index": selected_bar_index,
        "rule_results": rule_results,
        "evidence": {},
    }
