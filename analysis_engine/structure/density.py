from __future__ import annotations

from typing import Any

# PARKED:
# This score is intentionally not wired into the current artist-facing
# StructureMetrics contract. The implementation is kept for later validation
# and possible reuse, but must not be exposed in the product output yet.


def compute_density_score(macro_sections_payload: dict[str, Any]) -> float | None:
    """
    Compute a first simple structural density score.

    Interpretation:
    - higher score => more internal structural subdivision relative to total bars
    - lower score => sparser structural subdivision

    This is a structure-density baseline based only on stable macro section fields.
    """
    macro_sections = macro_sections_payload.get("macro_sections") or []

    if not macro_sections:
        return None

    total_bars = 0
    total_source_sections = 0

    for section in macro_sections:
        bar_count = section.get("bar_count")
        source_indices = section.get("source_section_indices") or []

        if bar_count is None:
            continue

        total_bars += int(bar_count)

        source_count = len(source_indices)
        if source_count <= 0:
            source_count = 1

        total_source_sections += source_count

    if total_bars <= 0:
        return None

    source_sections_per_16_bars = (total_source_sections / total_bars) * 16.0

    # Normalize:
    # 1 source section per 16 bars -> 0.0
    # 4 source sections per 16 bars -> 1.0
    normalized = (source_sections_per_16_bars - 1.0) / (4.0 - 1.0)

    if normalized < 0.0:
        return 0.0
    if normalized > 1.0:
        return 1.0

    return float(normalized)
