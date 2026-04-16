from __future__ import annotations

import math
from typing import Optional

from schemas import Section

MIN_SECTION_BARS = 4
MIN_MAIN_SECTION_BARS = 6
LONG_SECTION_BARS = 24
MIN_SPLIT_MARGIN_BARS = 4
MIN_EXTERNAL_BOUNDARY_DISTANCE_BARS = 8
MIN_PEAK_RATIO_SECTION = 0.45
BOUNDARY_LEFT_SHIFT_LOOKBACK_BARS = 8
RAMP_START_MIN_NOVELTY = 0.20
RAMP_START_MIN_CENTROID_DELTA = 600.0
RAMP_START_MIN_ROLLOFF_DELTA = 1200.0
RAMP_START_MIN_BANDWIDTH_DELTA = 400.0
RAMP_START_MIN_LOW_BAND_DELTA = 1000.0


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


def _merge_short_middle_sections_into_previous(sections: list[Section]) -> list[Section]:
    if len(sections) < 3:
        for index, section in enumerate(sections):
            section.index = int(index)
        return sections

    merged_sections = sections[:]
    current_index = 1
    while current_index < len(merged_sections) - 1:
        previous_section = merged_sections[current_index - 1]
        current_section = merged_sections[current_index]
        next_section = merged_sections[current_index + 1]

        current_bar_count = _section_bar_count(current_section)
        previous_bar_count = _section_bar_count(previous_section)
        next_bar_count = _section_bar_count(next_section)

        should_merge_into_previous = (
            current_bar_count < MIN_MAIN_SECTION_BARS
            and previous_bar_count >= MIN_MAIN_SECTION_BARS
            and next_bar_count >= MIN_MAIN_SECTION_BARS
        )

        if not should_merge_into_previous:
            current_index += 1
            continue

        previous_section.end = float(current_section.end)
        previous_section.end_bar_index = int(current_section.end_bar_index)
        previous_section.duration_sec = float(previous_section.end - previous_section.start)
        del merged_sections[current_index]

    for index, section in enumerate(merged_sections):
        section.index = int(index)

    return merged_sections


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


def _find_left_shifted_boundary_index(
    boundary_index: int,
    section_start_bar_index: int,
    novelty_curve: list[float],
    feature_names: list[str],
    bar_feature_vectors: list[list[float]],
) -> int:
    if boundary_index <= 0:
        return int(boundary_index)
    if not novelty_curve or not feature_names or not bar_feature_vectors:
        return int(boundary_index)

    required_feature_names = {
        "spectral_centroid_mean",
        "spectral_rolloff_mean",
        "spectral_bandwidth_mean",
        "low_band_energy_mean",
    }
    feature_index_by_name = {name: idx for idx, name in enumerate(feature_names)}
    if not all(name in feature_index_by_name for name in required_feature_names):
        return int(boundary_index)

    centroid_index = int(feature_index_by_name["spectral_centroid_mean"])
    rolloff_index = int(feature_index_by_name["spectral_rolloff_mean"])
    bandwidth_index = int(feature_index_by_name["spectral_bandwidth_mean"])
    low_band_index = int(feature_index_by_name["low_band_energy_mean"])

    max_valid_index = min(len(novelty_curve), len(bar_feature_vectors)) - 1
    if max_valid_index <= 0:
        return int(boundary_index)

    clamped_boundary_index = min(int(boundary_index), max_valid_index)
    search_start = max(
        int(section_start_bar_index) + 1,
        clamped_boundary_index - BOUNDARY_LEFT_SHIFT_LOOKBACK_BARS,
    )

    for candidate_index in range(search_start, clamped_boundary_index + 1):
        previous_index = candidate_index - 1
        if previous_index < 0:
            continue
        if candidate_index > max_valid_index or previous_index > max_valid_index:
            continue

        novelty_value = float(novelty_curve[candidate_index])
        if not math.isfinite(novelty_value) or novelty_value < RAMP_START_MIN_NOVELTY:
            continue

        current_vector = bar_feature_vectors[candidate_index]
        previous_vector = bar_feature_vectors[previous_index]
        if not current_vector or not previous_vector:
            continue

        needed_indices = (centroid_index, rolloff_index, bandwidth_index, low_band_index)
        if any(index >= len(current_vector) or index >= len(previous_vector) for index in needed_indices):
            continue

        centroid_delta = abs(float(current_vector[centroid_index]) - float(previous_vector[centroid_index]))
        rolloff_delta = abs(float(current_vector[rolloff_index]) - float(previous_vector[rolloff_index]))
        bandwidth_delta = abs(float(current_vector[bandwidth_index]) - float(previous_vector[bandwidth_index]))
        low_band_delta = abs(float(current_vector[low_band_index]) - float(previous_vector[low_band_index]))

        if (
            centroid_delta >= RAMP_START_MIN_CENTROID_DELTA
            or rolloff_delta >= RAMP_START_MIN_ROLLOFF_DELTA
            or bandwidth_delta >= RAMP_START_MIN_BANDWIDTH_DELTA
            or low_band_delta >= RAMP_START_MIN_LOW_BAND_DELTA
        ):
            return int(candidate_index)

    return int(boundary_index)


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


def _find_persistent_rise_split(
    section: Section,
    bars: list[list[float]],
    novelty_curve: list[float],
    primary_boundary_indices: list[int],
    section_reference_max: float,
) -> tuple[Optional[int], list[dict[str, object]]]:
    section_start = int(section.start_bar_index)
    section_end = int(section.end_bar_index)

    lookback_bars = 4
    lookahead_bars = 4
    min_rise_ratio = 1.35
    min_section_ratio = 0.40

    search_start = section_start + MIN_SPLIT_MARGIN_BARS
    search_end = section_end - MIN_SPLIT_MARGIN_BARS

    candidate_evaluations: list[dict[str, object]] = []
    for split_index in range(search_start, search_end + 1):
        left_segment_bars = int(split_index - section_start)
        right_segment_bars = int(section_end - split_index + 1)
        distance_to_left_boundary_bars = int(split_index - section_start)
        distance_to_right_boundary_bars = int(section_end - split_index)
        peak_time = (
            float(bars[split_index][0])
            if 0 <= split_index < len(bars) and len(bars[split_index]) >= 1
            else None
        )

        passed_min_segment_length = (
            left_segment_bars >= MIN_SPLIT_MARGIN_BARS and right_segment_bars >= MIN_SPLIT_MARGIN_BARS
        )

        too_close_to_external = False
        for boundary_index in primary_boundary_indices:
            if section_start < boundary_index <= section_end:
                continue
            if abs(split_index - boundary_index) < MIN_EXTERNAL_BOUNDARY_DISTANCE_BARS:
                too_close_to_external = True
                break
        passed_external_boundary_distance = not too_close_to_external

        has_lookback = (split_index - lookback_bars) >= section_start
        has_lookahead = (split_index + lookahead_bars - 1) <= section_end
        backward_mean = None
        forward_mean = None
        forward_to_backward_ratio = None
        section_ratio = None
        rejection_reason: Optional[str] = None

        eval_entry: dict[str, object] = {
            "candidate_type": "persistent_rise",
            "peak_bar_index": int(split_index),
            "peak_time": peak_time,
            "distance_to_left_boundary_bars": distance_to_left_boundary_bars,
            "distance_to_right_boundary_bars": distance_to_right_boundary_bars,
            "left_segment_bars": left_segment_bars,
            "right_segment_bars": right_segment_bars,
            "passed_min_segment_length": passed_min_segment_length,
            "passed_external_boundary_distance": passed_external_boundary_distance,
            "backward_mean": None,
            "forward_mean": None,
            "forward_to_backward_ratio": None,
            "section_ratio": None,
            "passed_all_checks": False,
            "rejection_reason": None,
        }

        if not passed_min_segment_length:
            rejection_reason = "insufficient_min_segment_length"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if not passed_external_boundary_distance:
            rejection_reason = "too_close_to_external_boundary"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if not has_lookback:
            rejection_reason = "insufficient_lookback_bars"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if not has_lookahead:
            rejection_reason = "insufficient_lookahead_bars"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue

        backward_window = novelty_curve[split_index - lookback_bars : split_index]
        forward_window = novelty_curve[split_index : split_index + lookahead_bars]
        backward_mean = float(sum(backward_window) / float(lookback_bars))
        forward_mean = float(sum(forward_window) / float(lookahead_bars))

        if math.isfinite(backward_mean) and backward_mean > 0.0:
            forward_to_backward_ratio = float(forward_mean / backward_mean)
        elif math.isfinite(forward_mean) and forward_mean > 0.0:
            forward_to_backward_ratio = float("inf")
        else:
            forward_to_backward_ratio = 0.0

        if section_reference_max > 0.0:
            section_ratio = float(forward_mean / section_reference_max)

        eval_entry["backward_mean"] = backward_mean
        eval_entry["forward_mean"] = forward_mean
        eval_entry["forward_to_backward_ratio"] = forward_to_backward_ratio
        eval_entry["section_ratio"] = section_ratio

        if not math.isfinite(forward_mean) or not math.isfinite(backward_mean):
            rejection_reason = "persistent_rise_non_finite_window_mean"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if forward_mean < (backward_mean * min_rise_ratio):
            rejection_reason = "persistent_rise_ratio_too_low"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if section_reference_max <= 0.0:
            rejection_reason = "section_reference_peak_unavailable"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue
        if forward_mean < (section_reference_max * min_section_ratio):
            rejection_reason = "persistent_rise_section_ratio_too_low"
            eval_entry["rejection_reason"] = rejection_reason
            candidate_evaluations.append(eval_entry)
            continue

        eval_entry["passed_all_checks"] = True
        eval_entry["rejection_reason"] = None
        candidate_evaluations.append(eval_entry)
        return int(split_index), candidate_evaluations

    return None, candidate_evaluations


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

    internal_local_maxima: list[int] = []
    candidate_evaluations: list[dict[str, object]] = []
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

    fallback_split_index, fallback_candidate_evaluations = _find_persistent_rise_split(
        section,
        bars,
        novelty_curve,
        primary_boundary_indices,
        section_reference_max,
    )
    candidate_evaluations.extend(fallback_candidate_evaluations)
    if fallback_split_index is not None:
        return int(fallback_split_index), internal_local_maxima, None, candidate_evaluations

    if not internal_local_maxima:
        return None, internal_local_maxima, "no_internal_local_maxima", candidate_evaluations
    if passed_external_distance_count == 0:
        return None, internal_local_maxima, "too_close_to_external_boundary", candidate_evaluations
    if passed_section_ratio_count == 0:
        return None, internal_local_maxima, "below_section_peak_ratio_threshold", candidate_evaluations
    return None, internal_local_maxima, "no_valid_secondary_peak_after_filters", candidate_evaluations


def _split_long_sections_with_secondary_peaks(
    sections: list[Section],
    bars: list[list[float]],
    boundary_candidates: list[float],
    novelty_curve: Optional[list[float]],
) -> tuple[list[Section], dict[tuple[float, float], dict[str, object]]]:
    if not sections or not bars or not novelty_curve:
        return sections, {}

    if len(novelty_curve) != len(bars):
        return sections, {}

    sanitized_novelty = [
        float(value) if math.isfinite(float(value)) else 0.0
        for value in novelty_curve
    ]

    primary_boundary_indices = sorted(
        set(_bar_index_for_time(bars, boundary_time) for boundary_time in boundary_candidates)
    )

    def _make_debug_entry(
        section: Section,
        internal_peak_indices: list[int],
        candidate_evaluations: list[dict[str, object]],
        rejection_reason: Optional[str],
        split_applied: bool,
        *,
        created_by_secondary_split: bool = False,
        parent_split_bar_index: Optional[int] = None,
        parent_split_time: Optional[float] = None,
    ) -> dict[str, object]:
        return {
            "debug_is_long_section_candidate": _section_bar_count(section) > LONG_SECTION_BARS,
            "debug_internal_peak_bar_indices": list(internal_peak_indices),
            "debug_split_applied": split_applied,
            "debug_candidate_evaluations": [dict(entry) for entry in candidate_evaluations],
            "debug_split_rejection_reason": rejection_reason,
            "debug_created_by_secondary_split": created_by_secondary_split,
            "debug_parent_split_bar_index": parent_split_bar_index,
            "debug_parent_split_time": parent_split_time,
        }

    def _make_child_placeholder_debug(
        split_index: int,
        split_time: float,
    ) -> dict[str, object]:
        return {
            "debug_is_long_section_candidate": False,
            "debug_internal_peak_bar_indices": [],
            "debug_split_applied": False,
            "debug_candidate_evaluations": [],
            "debug_split_rejection_reason": None,
            "debug_created_by_secondary_split": True,
            "debug_parent_split_bar_index": int(split_index),
            "debug_parent_split_time": float(split_time),
        }

    current_ranges: list[tuple[float, float]] = [
        (float(section.start), float(section.end))
        for section in sections
    ]
    debug_by_range: dict[tuple[float, float], dict[str, object]] = {}

    max_iterations = 4

    for _ in range(max_iterations):
        current_sections = _rebuild_sections_from_ranges(current_ranges, bars)
        next_ranges: list[tuple[float, float]] = []
        next_debug_by_range: dict[tuple[float, float], dict[str, object]] = {}
        had_split = False

        for section in current_sections:
            section_range = (float(section.start), float(section.end))
            existing_debug_entry = debug_by_range.get(section_range, {})

            split_index, internal_peak_indices, rejection_reason, candidate_evaluations = _evaluate_secondary_split(
                section,
                bars,
                sanitized_novelty,
                primary_boundary_indices,
            )

            current_debug_entry = _make_debug_entry(
                section=section,
                internal_peak_indices=internal_peak_indices,
                candidate_evaluations=candidate_evaluations,
                rejection_reason=rejection_reason,
                split_applied=split_index is not None,
                created_by_secondary_split=bool(
                    existing_debug_entry.get("debug_created_by_secondary_split", False)
                ),
                parent_split_bar_index=existing_debug_entry.get("debug_parent_split_bar_index"),
                parent_split_time=existing_debug_entry.get("debug_parent_split_time"),
            )

            if split_index is None:
                next_ranges.append(section_range)
                next_debug_by_range[section_range] = current_debug_entry
                continue

            split_time = float(bars[split_index][0])
            if split_time <= float(section.start) or split_time >= float(section.end):
                next_ranges.append(section_range)
                next_debug_by_range[section_range] = current_debug_entry
                continue

            had_split = True

            left_range = (float(section.start), split_time)
            right_range = (split_time, float(section.end))
            next_ranges.append(left_range)
            next_ranges.append(right_range)

            next_debug_by_range[left_range] = _make_child_placeholder_debug(split_index, split_time)
            next_debug_by_range[right_range] = _make_child_placeholder_debug(split_index, split_time)

        current_ranges = next_ranges
        debug_by_range = next_debug_by_range

        if not had_split:
            break

    final_sections = _rebuild_sections_from_ranges(current_ranges, bars)
    final_debug_by_range: dict[tuple[float, float], dict[str, object]] = {}

    # Finalen Sections immer ihr EIGENES letztes Debug geben
    for section in final_sections:
        section_range = (float(section.start), float(section.end))
        existing_debug_entry = debug_by_range.get(section_range, {})

        split_index, internal_peak_indices, rejection_reason, candidate_evaluations = _evaluate_secondary_split(
            section,
            bars,
            sanitized_novelty,
            primary_boundary_indices,
        )

        final_debug_by_range[section_range] = _make_debug_entry(
            section=section,
            internal_peak_indices=internal_peak_indices,
            candidate_evaluations=candidate_evaluations,
            rejection_reason=rejection_reason,
            split_applied=split_index is not None,
            created_by_secondary_split=bool(
                existing_debug_entry.get("debug_created_by_secondary_split", False)
            ),
            parent_split_bar_index=existing_debug_entry.get("debug_parent_split_bar_index"),
            parent_split_time=existing_debug_entry.get("debug_parent_split_time"),
        )

    return final_sections, final_debug_by_range


def _attach_section_debug_diagnostics(
    sections: list[Section],
    bars: list[list[float]],
    split_debug_by_range: Optional[dict[tuple[float, float], dict[str, object]]] = None,
) -> list[Section]:
    if not sections:
        return sections

    split_debug_by_range = split_debug_by_range or {}
    for section in sections:
        section_range = (float(section.start), float(section.end))
        debug_entry = split_debug_by_range.get(section_range)

        if not debug_entry:
            section.debug_is_long_section_candidate = _section_bar_count(section) > LONG_SECTION_BARS
            section.debug_internal_peak_bar_indices = []
            section.debug_internal_peak_times = []
            section.debug_split_applied = False
            section.debug_candidate_evaluations = []
            section.debug_split_rejection_reason = None
            continue

        internal_peak_indices = list(debug_entry.get("debug_internal_peak_bar_indices", []))
        split_applied = bool(debug_entry.get("debug_split_applied", False))
        candidate_evaluations = list(debug_entry.get("debug_candidate_evaluations", []))
        rejection_reason = debug_entry.get("debug_split_rejection_reason")
        is_long_candidate = bool(debug_entry.get("debug_is_long_section_candidate", False))

        peak_times = [
            float(bars[index][0])
            for index in internal_peak_indices
            if 0 <= index < len(bars)
        ]

        section.debug_is_long_section_candidate = is_long_candidate
        section.debug_internal_peak_bar_indices = internal_peak_indices
        section.debug_internal_peak_times = peak_times
        section.debug_split_applied = split_applied
        section.debug_candidate_evaluations = candidate_evaluations if is_long_candidate else []
        section.debug_split_rejection_reason = (
            None
            if section.debug_split_applied or not is_long_candidate
            else rejection_reason
        )
        section.debug_created_by_secondary_split = bool(
            debug_entry.get("debug_created_by_secondary_split", False)
        )
        parent_split_bar_index = debug_entry.get("debug_parent_split_bar_index")
        section.debug_parent_split_bar_index = (
            int(parent_split_bar_index)
            if isinstance(parent_split_bar_index, int)
            else None
        )
        parent_split_time = debug_entry.get("debug_parent_split_time")
        section.debug_parent_split_time = (
            float(parent_split_time)
            if isinstance(parent_split_time, (int, float))
            else None
        )

    return sections


def build_sections(
    bars: list[list[float]],
    boundary_candidates: list[float],
    track_duration: float,
    novelty_curve: Optional[list[float]] = None,
    feature_names: Optional[list[str]] = None,
    bar_feature_vectors: Optional[list[list[float]]] = None,
) -> list[Section]:
    duration = max(0.0, float(track_duration))
    if duration <= 0.0:
        return []

    valid_boundaries = [
        float(value)
        for value in boundary_candidates
        if 0.0 < float(value) < duration
    ]

    boundary_indices = sorted(
        set(_bar_index_for_time(bars, boundary_time) for boundary_time in valid_boundaries)
    )

    refined_boundary_indices = boundary_indices[:]
    if novelty_curve and feature_names and bar_feature_vectors:
        refined_boundary_indices = []
        previous_boundary_index = 0
        for boundary_index in boundary_indices:
            shifted_index = _find_left_shifted_boundary_index(
                boundary_index=boundary_index,
                section_start_bar_index=previous_boundary_index,
                novelty_curve=novelty_curve,
                feature_names=feature_names,
                bar_feature_vectors=bar_feature_vectors,
            )
            shifted_index = max(0, min(int(shifted_index), len(bars) - 1))
            refined_boundary_indices.append(shifted_index)
            previous_boundary_index = shifted_index

        refined_boundary_indices = sorted(set(refined_boundary_indices))

    refined_boundaries = [
        float(bars[index][0])
        for index in refined_boundary_indices
        if 0 <= index < len(bars) and len(bars[index]) >= 1
    ]
    boundaries = sorted(set([0.0, duration, *refined_boundaries]))

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
    refined_sections, split_debug_by_range = _split_long_sections_with_secondary_peaks(
        cleaned_sections,
        bars,
        refined_boundaries,
        novelty_curve,
    )
    final_sections = _cleanup_small_sections(refined_sections, bars)
    final_sections = _merge_short_middle_sections_into_previous(final_sections)
    return _attach_section_debug_diagnostics(final_sections, bars, split_debug_by_range=split_debug_by_range)
