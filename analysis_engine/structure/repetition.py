from __future__ import annotations


def compute_repetition_score(total_bars: int | None, segment_count: int | None) -> float | None:
    """
    Compute a first simple structural repetition score.

    Interpretation:
    - higher score => fewer segments relative to total bars
    - lower score => more segmentation / more structural change

    This is intentionally a simple baseline score and should be refined later.
    """
    if total_bars is None or segment_count is None:
        return None

    if total_bars <= 0 or segment_count <= 0:
        return None

    bars_per_segment = total_bars / segment_count

    # Normalize a coarse structural repetition proxy:
    # 4 bars/segment  -> 0.0
    # 32 bars/segment -> 1.0
    normalized = (bars_per_segment - 4.0) / (32.0 - 4.0)

    if normalized < 0.0:
        return 0.0
    if normalized > 1.0:
        return 1.0

    return float(normalized)
