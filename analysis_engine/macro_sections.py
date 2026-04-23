from __future__ import annotations

from typing import Any

from analysis_engine.macro_boundary_decision import analyze_macro_boundary_decisions
from analysis_engine.macro_section_build import build_macro_sections_payload


def _build_group_form_summary(
    macro_boundary_decisions: list[dict[str, Any]],
) -> dict[str, int]:
    summary = {
        "isolated_anchor": 0,
        "retained_anchor_with_ignored_neighbors": 0,
        "rule_shifted_anchor": 0,
        "suppressed_group": 0,
        "total_groups": len(macro_boundary_decisions),
    }

    for decision in macro_boundary_decisions:
        group_form = decision.get("group_form")
        if group_form in summary:
            summary[group_form] += 1

    return summary


def _build_retained_anchor_tendency_summary(
    macro_boundary_decisions: list[dict[str, Any]],
) -> dict[str, int]:
    summary = {
        "duplicate_leaning": 0,
        "cluster_leaning": 0,
        "mixed": 0,
        "total_retained_anchor_groups": 0,
    }

    for decision in macro_boundary_decisions:
        if decision.get("group_form") != "retained_anchor_with_ignored_neighbors":
            continue

        summary["total_retained_anchor_groups"] += 1

        tendency = decision.get("retained_anchor_tendency")
        if tendency in summary:
            summary[tendency] += 1

    return summary


def analyze_macro_sections(
    sections: list[dict[str, float | int]],
    bars: list[dict[str, float | int]],
    final_boundaries: list[dict[str, Any]],
    scored_candidates: list[dict[str, Any]],
    track_duration_sec: float,
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
            "group_form_summary": {
                "isolated_anchor": 0,
                "retained_anchor_with_ignored_neighbors": 0,
                "rule_shifted_anchor": 0,
                "suppressed_group": 0,
                "total_groups": 0,
            },
            "retained_anchor_tendency_summary": {
                "duplicate_leaning": 0,
                "cluster_leaning": 0,
                "mixed": 0,
                "total_retained_anchor_groups": 0,
            },
            "is_empty": True,
        }

    track_end_bar_index = max(int(bar["index"]) for bar in bars)
    decision_payload = analyze_macro_boundary_decisions(
        scored_candidates,
        track_end_bar_index=track_end_bar_index,
    )
    build_payload = build_macro_sections_payload(
        sections=sections,
        selected_group_anchor_bar_indices=decision_payload["selected_group_anchor_bar_indices"],
        final_boundaries=final_boundaries,
        track_duration_sec=track_duration_sec,
    )
    group_form_summary = _build_group_form_summary(
        decision_payload["macro_boundary_decisions"]
    )
    retained_anchor_tendency_summary = _build_retained_anchor_tendency_summary(
        decision_payload["macro_boundary_decisions"]
    )

    return {
        "method": "greedy_min_bar_macro_sections",
        **build_payload,
        "selected_group_anchor_bar_indices": decision_payload["selected_group_anchor_bar_indices"],
        "macro_boundary_decisions": decision_payload["macro_boundary_decisions"],
        "local_boundary_groups": decision_payload["local_boundary_groups"],
        "group_form_summary": group_form_summary,
        "retained_anchor_tendency_summary": retained_anchor_tendency_summary,
    }
