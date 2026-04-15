from __future__ import annotations

import math
from typing import Optional

from schemas import Section

MIN_SECTION_BARS = 4
LONG_SECTION_BARS = 24
MIN_SPLIT_MARGIN_BARS = 4
MIN_EXTERNAL_BOUNDARY_DISTANCE_BARS = 8
MIN_PEAK_RATIO_GLOBAL = 0.20
MIN_PEAK_RATIO_SECTION = 0.45


def _resolve_start_bar_index(bars: list[list[float]], start: float) -> int:
    if not bars:
        return 0

    for index, bar in enumerate(bars):
        if len(bar) < 2:
            continue
        bar_end = float(bar[1])
        if bar_end > start:
            return index

    return max(0, len(bars) - 1)


def _resolve_end_bar_index(bars: list[list[float]], end: float, start_bar_index: int) -> int:
    if not bars:
        return 0

    for index in range(len(bars) - 1, -1, -1):
        bar = bars[index]
        if len(bar) < 2:
            continue
        bar_start = float(bar[0])
        if bar_start < end:
            return index

    return max(0, start_bar_index)


def _rebuild_sections_from_ranges(
    ranges: list[tuple[float, float]],
    bars: list[list[float]],
) -> list[Section]:
    sections: list[Section] = []

    for start, end in ranges:
        if not (end > start):
            continue

        start_bar_index = _resolve_start_bar_index(bars, start)
        end_bar_index = _resolve_end_bar_index(bars, end, start_bar_index)

        if end_bar_index < start_bar_index:
            end_bar_index = start_bar_index

        sections.append(
            Section(
                index=len(sections),
                start=float(start),
                end=float(end),
                start_bar_index=int(start_bar_index),
                end_bar_index=int(end_bar_index),
                duration_sec=float(end - start),
            )
        )

    return sections


def _section_bar_count(section: Section) -> int:
    return int(section.end_bar_index - section.start_bar_index + 1)


def _cleanup_small_sections(
    raw_sections: list[Section],
    bars: list[list[float]],
) -> list[Section]:
    ranges: list[tuple[float, float]] = [
        (float(section.start), float(section.end))
        for section in raw_sections
        if section.end > section.start
    ]

    while len(ranges) > 1:
        sections = _rebuild_sections_from_ranges(ranges, bars)

        small_index = -1
        for index, section in enumerate(sections):
            if _section_bar_count(section) < MIN_SECTION_BARS:
                small_index = index
                break

        if small_index < 0:
            return sections

        if small_index == 0:
            merged_range = (ranges[0][0], ranges[1][1])
            ranges[1] = merged_range
            del ranges[0]
            continue

        if small_index == len(ranges) - 1:
            merged_range = (ranges[small_index - 1][0], ranges[small_index][1])
            ranges[small_index - 1] = merged_range
            del ranges[small_index]
            continue

        short_section = sections[small_index]
        next_section = sections[small_index + 1]
        can_merge_forward_to_min = (
            _section_bar_count(short_section) + _section_bar_count(next_section)
        ) >= MIN_SECTION_BARS

        if can_merge_forward_to_min:
            merged_range = (ranges[small_index][0], ranges[small_index + 1][1])
            ranges[small_index + 1] = merged_range
            del ranges[small_index]
            continue

        merged_range = (ranges[small_index - 1][0], ranges[small_index][1])
        ranges[small_index - 1] = merged_range
        del ranges[small_index]

    return _rebuild_sections_from_ranges(ranges, bars)


def _bar_index_for_time(bars: list[list[float]], time_value: float) -> int:
    if not bars:
        return 0

    target_time = float(time_value)
    for index, bar in enumerate(bars):
        if len(bar) < 2:
            continue
        bar_start = float(bar[0])
        if math.isclose(bar_start, target_time, rel_tol=0.0, abs_tol=1e-6):
            return index
        if bar_start >= target_time:
            return index

    return max(0, len(bars) - 1)


def _resolve_secondary_split_index(
    section: Section,
    bars: list[list[float]],
    novelty_curve: list[float],
    primary_boundary_indices: list[int],
) -> Optional[int]:
    split_index, _, _, _ = _evaluate_secondary_split(
        section,
        bars,
        novelty_curve,
        primary_boundary_indices,
    )
    return split_index


def _evaluate_secondary_split(
    section: Section,
    bars: list[list[float]],
    novelty_curve: list[float],
    primary_boundary_indices: list[int],
) -> tuple[Optional[int], list[int], Optional[str], list[dict[str, object]]]:
    section_bar_count = _section_bar_count(section)
    if section_bar_count <= LONG_SECTION_BARS:
        return None, [], None, []

    if not novelty_curve:
        return None, [], "novelty_curve_unavailable", []

    section_start = int(section.start_bar_index)
    section_end = int(section.end_bar_index)
    if section_end <= section_start:
        return None, [], "invalid_section_bar_range", []

    search_start = section_start + MIN_SPLIT_MARGIN_BARS
    search_end = section_end - MIN_SPLIT_MARGIN_BARS
    if search_end <= search_start:
        return None, [], "insufficient_margin_for_internal_split", []

    global_max = max(float(value) for value in novelty_curve) if novelty_curve else 0.0
    if global_max <= 0.0:
        return None, [], "global_novelty_max_non_positive", []

    internal_local_maxima: list[int] = []
    candidate_evaluations: list[dict[str, object]] = []
    passed_global_ratio_count = 0
    passed_section_ratio_count = 0
    passed_external_distance_count = 0

    for peak_index in range(max(1, search_start), min(len(novelty_curve) - 1, search_end + 1)):
        peak_value = float(novelty_curve[peak_index])
        left_value = float(novelty_curve[peak_index - 1])
        right_value = float(novelty_curve[peak_index + 1])
        if not (peak_value > left_value and peak_value > right_value):
            continue

        internal_local_maxima.append(int(peak_index))

    ranked_local_maxima = sorted(
        internal_local_maxima,
        key=lambda index: float(novelty_curve[index]),
        reverse=True,
    )

    section_reference_candidates: list[float] = []

    for peak_index in ranked_local_maxima:
        peak_value = float(novelty_curve[peak_index])

        if not math.isfinite(peak_value):
            continue
        if peak_value <= 0.0:
            continue
        if peak_value < (global_max * MIN_PEAK_RATIO_GLOBAL):
            continue

        too_close_to_external = False
        for boundary_index in primary_boundary_indices:
            if section_start < boundary_index <= section_end:
                continue
            if abs(peak_index - boundary_index) < MIN_EXTERNAL_BOUNDARY_DISTANCE_BARS:
                too_close_to_external = True
                break

        if too_close_to_external:
            continue

        section_reference_candidates.append(peak_value)

    section_reference_max = max(section_reference_candidates) if section_reference_candidates else 0.0

    for peak_index in ranked_local_maxima:
        peak_value = float(novelty_curve[peak_index])
        peak_time = (
            float(bars[peak_index][0])
            if 0 <= peak_index < len(bars) and len(bars[peak_index]) >= 1
            else None
        )
        left_segment_bars = int(peak_index - section_start)
        right_segment_bars = int(section_end - peak_index + 1)
        distance_to_left_boundary_bars = int(peak_index - section_start)
        distance_to_right_boundary_bars = int(section_end - peak_index)
        passed_min_segment_length = (
            left_segment_bars >= MIN_SPLIT_MARGIN_BARS and right_segment_bars >= MIN_SPLIT_MARGIN_BARS
        )
        passed_external_boundary_distance = True
        rejection_reason: Optional[str] = None

        eval_entry: dict[str, object] = {
            "peak_bar_index": int(peak_index),
            "peak_time": peak_time,
            "peak_strength": float(peak_value) if math.isfinite(peak_value) else None,
            "distance_to_left_boundary_bars": distance_to_left_boundary_bars,
            "distance_to_right_boundary_bars": distance_to_right_boundary_bars,
            "left_segment_bars": left_segment_bars,
            "right_segment_bars": right_segment_bars,
            "passed_external_boundary_distance": True,
            "passed_min_segment_length": passed_min_segment_length,
            "passed_all_checks": False,
            "rejection_reason": None,
        }

        if not math.isfinite(peak_value):
            rejection_reason = "peak_strength_non_finite"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if peak_value <= 0.0:
            rejection_reason = "peak_strength_non_positive"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if peak_value < (global_max * MIN_PEAK_RATIO_GLOBAL):
            rejection_reason = "below_global_peak_ratio_threshold"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        passed_global_ratio_count += 1

        too_close_to_external = False
        for boundary_index in primary_boundary_indices:
            if section_start < boundary_index <= section_end:
                continue
            if abs(peak_index - boundary_index) < MIN_EXTERNAL_BOUNDARY_DISTANCE_BARS:
                too_close_to_external = True
                break
        if too_close_to_external:
            passed_external_boundary_distance = False
            rejection_reason = "too_close_to_external_boundary"
            eval_entry["passed_external_boundary_distance"] = passed_external_boundary_distance
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        passed_external_distance_count += 1

        if section_reference_max <= 0.0:
            rejection_reason = "section_reference_peak_unavailable"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue

        if peak_value < (section_reference_max * MIN_PEAK_RATIO_SECTION):
            rejection_reason = "below_section_peak_ratio_threshold"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        passed_section_ratio_count += 1

        eval_entry["passed_all_checks"] = True
        eval_entry["rejection_reason"] = None
        candidate_evaluations.append(eval_entry)
        return int(peak_index), internal_local_maxima, None, candidate_evaluations

    if not internal_local_maxima:
        return None, internal_local_maxima, "no_internal_local_maxima", candidate_evaluations
    if passed_global_ratio_count == 0:
        return None, internal_local_maxima, "below_global_peak_ratio_threshold", candidate_evaluations
    if passed_section_ratio_count == 0:
        return None, internal_local_maxima, "below_section_peak_ratio_threshold", candidate_evaluations
    if passed_external_distance_count == 0:
        return None, internal_local_maxima, "too_close_to_external_boundary", candidate_evaluations
    return None, internal_local_maxima, "no_valid_secondary_peak_after_filters", candidate_evaluations


def _split_long_sections_with_secondary_peaks(
    sections: list[Section],
    bars: list[list[float]],
    boundary_candidates: list[float],
    novelty_curve: Optional[list[float]],
) -> list[Section]:
    if not sections or not bars or not novelty_curve:
        return sections

    if len(novelty_curve) != len(bars):
        return sections

    sanitized_novelty = [
        float(value) if math.isfinite(float(value)) else 0.0
        for value in novelty_curve
    ]

    primary_boundary_indices = sorted(
        set(_bar_index_for_time(bars, boundary_time) for boundary_time in boundary_candidates)
    )

    refined_ranges: list[tuple[float, float]] = []
    for section in sections:
        split_index = _resolve_secondary_split_index(
            section,
            bars,
            sanitized_novelty,
            primary_boundary_indices,
        )
        if split_index is None:
            refined_ranges.append((float(section.start), float(section.end)))
            continue

        split_time = float(bars[split_index][0])
        if split_time <= float(section.start) or split_time >= float(section.end):
            refined_ranges.append((float(section.start), float(section.end)))
            continue

        refined_ranges.append((float(section.start), split_time))
        refined_ranges.append((split_time, float(section.end)))

    return _rebuild_sections_from_ranges(refined_ranges, bars)


def _attach_section_debug_diagnostics(
    sections: list[Section],
    bars: list[list[float]],
    boundary_candidates: list[float],
    novelty_curve: Optional[list[float]],
) -> list[Section]:
    if not sections:
        return sections

    if not novelty_curve or len(novelty_curve) != len(bars):
        for section in sections:
            section.debug_is_long_section_candidate = _section_bar_count(section) > LONG_SECTION_BARS
            section.debug_internal_peak_bar_indices = []
            section.debug_internal_peak_times = []
            section.debug_split_applied = False
            section.debug_candidate_evaluations = []
            section.debug_split_rejection_reason = (
                "novelty_curve_unavailable"
                if section.debug_is_long_section_candidate
                else None
            )
        return sections

    sanitized_novelty = [
        float(value) if math.isfinite(float(value)) else 0.0
        for value in novelty_curve
    ]
    primary_boundary_indices = sorted(
        set(_bar_index_for_time(bars, boundary_time) for boundary_time in boundary_candidates)
    )

    for section in sections:
        is_long_candidate = _section_bar_count(section) > LONG_SECTION_BARS
        split_index, internal_peak_indices, rejection_reason, candidate_evaluations = _evaluate_secondary_split(
            section,
            bars,
            sanitized_novelty,
            primary_boundary_indices,
        )

        peak_times = [
            float(bars[index][0])
            for index in internal_peak_indices
            if 0 <= index < len(bars)
        ]

        section.debug_is_long_section_candidate = is_long_candidate
        section.debug_internal_peak_bar_indices = internal_peak_indices
        section.debug_internal_peak_times = peak_times
        section.debug_split_applied = bool(is_long_candidate and split_index is not None)
        section.debug_candidate_evaluations = candidate_evaluations if is_long_candidate else []
        section.debug_split_rejection_reason = (
            None
            if section.debug_split_applied or not is_long_candidate
            else (rejection_reason or "no_valid_secondary_peak")
        )

    return sections


def build_sections(
    bars: list[list[float]],
    boundary_candidates: list[float],
    track_duration: float,
    novelty_curve: Optional[list[float]] = None,
) -> list[Section]:
    duration = max(0.0, float(track_duration))
    if duration <= 0.0:
        return []

    valid_boundaries = [
        float(value)
        for value in boundary_candidates
        if 0.0 < float(value) < duration
    ]

    boundaries = sorted(set([0.0, duration, *valid_boundaries]))

    sections: list[Section] = []

    for start, end in zip(boundaries[:-1], boundaries[1:]):
        if not (end > start):
            continue

        start_bar_index = _resolve_start_bar_index(bars, start)
        end_bar_index = _resolve_end_bar_index(bars, end, start_bar_index)

        if end_bar_index < start_bar_index:
            end_bar_index = start_bar_index

        sections.append(
            Section(
                index=len(sections),
                start=float(start),
                end=float(end),
                start_bar_index=int(start_bar_index),
                end_bar_index=int(end_bar_index),
                duration_sec=float(end - start),
            )
        )

    if not sections:
        fallback_end_bar_index = max(0, len(bars) - 1) if bars else 0
        sections.append(
            Section(
                index=0,
                start=0.0,
                end=duration,
                start_bar_index=0,
                end_bar_index=int(fallback_end_bar_index),
                duration_sec=duration,
            )
        )

    cleaned_sections = _cleanup_small_sections(sections, bars)
    refined_sections = _split_long_sections_with_secondary_peaks(
        cleaned_sections,
        bars,
        boundary_candidates,
        novelty_curve,
    )
    final_sections = _cleanup_small_sections(refined_sections, bars)
    return _attach_section_debug_diagnostics(
        final_sections,
        bars,
        boundary_candidates,
        novelty_curve,
    )
