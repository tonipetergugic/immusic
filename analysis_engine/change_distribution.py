from __future__ import annotations

import numpy as np

from schemas import Bar, ChangeDistributionMetrics, Span


INACTIVE_THRESHOLD = 0.22
MIN_INACTIVE_REGION_BARS = 6
BALANCE_REFERENCE_STD = 0.18


def compute_change_distribution(
    bars: list[Bar],
    smoothed_curve: list[float],
) -> ChangeDistributionMetrics:
    if not _has_valid_inputs(bars, smoothed_curve):
        return _empty_change_distribution()

    timeline_profile = _normalize_curve(smoothed_curve)

    front_section_activity, mid_section_activity, end_section_activity = _compute_section_activity(
        timeline_profile
    )

    inactive_regions = _find_inactive_regions(
        bars=bars,
        timeline_profile=timeline_profile,
    )

    section_values = np.asarray(
        [front_section_activity, mid_section_activity, end_section_activity],
        dtype=np.float64,
    )

    activity_std = float(np.std(section_values))
    balance_score = 1.0 - float(np.clip(activity_std / BALANCE_REFERENCE_STD, 0.0, 1.0))

    inactive_bars = sum(region.length_bars for region in inactive_regions)
    inactive_ratio = float(np.clip(inactive_bars / len(bars), 0.0, 1.0))

    global_score = 0.7 * balance_score + 0.3 * (1.0 - inactive_ratio)
    global_score = float(np.clip(global_score, 0.0, 1.0))

    distribution_label = _distribution_label(
        front_section_activity=front_section_activity,
        mid_section_activity=mid_section_activity,
        end_section_activity=end_section_activity,
        balance_score=balance_score,
    )

    return ChangeDistributionMetrics(
        global_score=global_score,
        distribution_label=distribution_label,
        timeline_profile=timeline_profile,
        front_section_activity=front_section_activity,
        mid_section_activity=mid_section_activity,
        end_section_activity=end_section_activity,
        inactive_regions=inactive_regions,
    )


def _empty_change_distribution() -> ChangeDistributionMetrics:
    return ChangeDistributionMetrics(
        global_score=0.0,
        distribution_label="very_unbalanced",
        timeline_profile=[],
        front_section_activity=0.0,
        mid_section_activity=0.0,
        end_section_activity=0.0,
        inactive_regions=[],
    )


def _has_valid_inputs(bars: list[Bar], smoothed_curve: list[float]) -> bool:
    if not bars or not smoothed_curve:
        return False
    if len(bars) != len(smoothed_curve):
        return False
    return True


def _normalize_curve(smoothed_curve: list[float]) -> list[float]:
    curve = np.asarray(smoothed_curve, dtype=np.float64)

    if curve.size == 0:
        return []

    max_value = float(np.max(curve))
    if max_value <= 0.0:
        return [0.0 for _ in curve.tolist()]

    normalized = curve / max_value
    normalized = np.clip(normalized, 0.0, 1.0)

    return [float(value) for value in normalized.tolist()]


def _compute_section_activity(
    timeline_profile: list[float],
) -> tuple[float, float, float]:
    values = np.asarray(timeline_profile, dtype=np.float64)

    if values.size == 0:
        return 0.0, 0.0, 0.0

    segments = np.array_split(values, 3)

    front = float(np.mean(segments[0])) if segments[0].size else 0.0
    middle = float(np.mean(segments[1])) if segments[1].size else 0.0
    end = float(np.mean(segments[2])) if segments[2].size else 0.0

    return front, middle, end


def _find_inactive_regions(
    bars: list[Bar],
    timeline_profile: list[float],
) -> list[Span]:
    values = np.asarray(timeline_profile, dtype=np.float64)

    inactive_regions: list[Span] = []
    start_index: int | None = None

    for index, value in enumerate(values):
        is_inactive = float(value) <= INACTIVE_THRESHOLD

        if is_inactive and start_index is None:
            start_index = index
            continue

        if not is_inactive and start_index is not None:
            _append_inactive_region(
                inactive_regions=inactive_regions,
                bars=bars,
                start_index=start_index,
                end_index=index - 1,
                values=values,
            )
            start_index = None

    if start_index is not None:
        _append_inactive_region(
            inactive_regions=inactive_regions,
            bars=bars,
            start_index=start_index,
            end_index=len(values) - 1,
            values=values,
        )

    return inactive_regions


def _append_inactive_region(
    inactive_regions: list[Span],
    bars: list[Bar],
    start_index: int,
    end_index: int,
    values: np.ndarray,
) -> None:
    length_bars = end_index - start_index + 1
    if length_bars < MIN_INACTIVE_REGION_BARS:
        return

    start_time_sec = float(bars[start_index].start)
    end_time_sec = float(bars[end_index].end)
    length_sec = float(end_time_sec - start_time_sec)
    score = float(np.mean(values[start_index : end_index + 1]))

    inactive_regions.append(
        Span(
            start_bar=start_index,
            end_bar=end_index,
            start_time_sec=start_time_sec,
            end_time_sec=end_time_sec,
            length_bars=length_bars,
            length_sec=length_sec,
            score=score,
        )
    )


def _distribution_label(
    *,
    front_section_activity: float,
    mid_section_activity: float,
    end_section_activity: float,
    balance_score: float,
) -> str:
    if balance_score >= 0.75:
        return "balanced"

    section_map = {
        "front_loaded": front_section_activity,
        "mid_loaded": mid_section_activity,
        "end_loaded": end_section_activity,
    }

    dominant_label = max(section_map, key=section_map.get)
    dominant_value = section_map[dominant_label]
    weakest_value = min(section_map.values())

    if dominant_value - weakest_value < 0.12:
        return "slightly_unbalanced"

    return dominant_label
