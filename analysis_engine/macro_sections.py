from __future__ import annotations

from typing import Any

from analysis_engine.macro_boundary_decision import analyze_macro_boundary_decisions
from analysis_engine.macro_section_build import build_macro_sections_payload


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

    decision_payload = analyze_macro_boundary_decisions(scored_candidates)
    build_payload = build_macro_sections_payload(
        sections=sections,
        bars=bars,
        selected_group_anchor_bar_indices=decision_payload["selected_group_anchor_bar_indices"],
        final_boundaries=final_boundaries,
    )

    return {
        "method": "greedy_min_bar_macro_sections",
        **build_payload,
        "selected_group_anchor_bar_indices": decision_payload["selected_group_anchor_bar_indices"],
        "macro_boundary_decisions": decision_payload["macro_boundary_decisions"],
        "local_boundary_groups": decision_payload["local_boundary_groups"],
    }
