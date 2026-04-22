from __future__ import annotations

from math import sqrt
from typing import Any


def compute_contrast_score(macro_sections_payload: dict[str, Any]) -> float | None:
    """
    Compute a first simple structural contrast score.

    Interpretation:
    - higher score => macro sections differ more in structural size
    - lower score => macro sections are more uniform in size

    This is a form-contrast baseline, not an audio-feature contrast score.
    """
    macro_sections = macro_sections_payload.get("macro_sections") or []

    if len(macro_sections) < 2:
        return 0.0 if macro_sections else None

    bar_counts: list[float] = []

    for section in macro_sections:
        bar_count = section.get("bar_count")
        if bar_count is None:
            continue
        bar_counts.append(float(bar_count))

    if len(bar_counts) < 2:
        return None

    mean_value = sum(bar_counts) / len(bar_counts)
    if mean_value <= 0:
        return None

    variance = sum((value - mean_value) ** 2 for value in bar_counts) / len(bar_counts)
    std_dev = sqrt(variance)

    # Coefficient of variation as a simple normalized contrast proxy
    normalized = std_dev / mean_value

    if normalized < 0.0:
        return 0.0
    if normalized > 1.0:
        return 1.0

    return float(normalized)
