from __future__ import annotations

from typing import Any

# PARKED:
# This score is intentionally not wired into the current artist-facing
# StructureMetrics contract. The implementation is kept for later validation
# and possible reuse, but must not be exposed in the product output yet.


def compute_development_score(macro_sections_payload: dict[str, Any]) -> float | None:
    """
    Compute a first simple structural development score.

    Interpretation:
    - higher score => more internal structural development inside macro segments
    - lower score => flatter macro segments with less internal subdivision

    The score is based only on stable macro section fields.
    """
    macro_sections = macro_sections_payload.get("macro_sections") or []

    if not macro_sections:
        return None

    source_section_counts: list[int] = []

    for section in macro_sections:
        source_indices = section.get("source_section_indices") or []
        count = len(source_indices)

        if count <= 0:
            count = 1

        source_section_counts.append(count)

    if not source_section_counts:
        return None

    average_source_sections = sum(source_section_counts) / len(source_section_counts)

    # Normalize:
    # 1 source section per macro section -> 0.0
    # 4 source sections per macro section -> 1.0
    normalized = (average_source_sections - 1.0) / (4.0 - 1.0)

    if normalized < 0.0:
        return 0.0
    if normalized > 1.0:
        return 1.0

    return float(normalized)
