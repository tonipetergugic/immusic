from __future__ import annotations

from dataclasses import dataclass, field
from statistics import mean
from typing import Any, Iterable, Optional, Sequence

from schemas import Section
from boundary_evidence import build_secondary_split_candidate
from boundary_metrics import (
    compute_local_contrast,
    compute_neighborhood_density,
    compute_peak_dominance,
)
from candidate_scoring import compute_composite_transition_score
from feature_change_metrics import (
    compute_persistence_after_change,
    compute_state_change_strength,
)
from section_progression_metrics import compute_section_progression_strengths
from transition_window_metrics import compute_transition_window_profile

MIN_SECTION_BARS = 8
LONG_SECTION_BARS = 24
SECONDARY_SPLIT_EDGE_GUARD_BARS = 8
SECONDARY_SPLIT_MIN_PEAK_RATIO = 0.35
SECONDARY_SPLIT_STD_FACTOR = 0.75


@dataclass
class DebugSection(Section):
    debug_is_long_section_candidate: bool = False
    debug_internal_peak_bar_indices: list[int] = field(default_factory=list)
    debug_internal_peak_times: list[float] = field(default_factory=list)
    debug_split_applied: bool = False
    debug_candidate_evaluations: list[dict] = field(default_factory=list)
    debug_split_rejection_reason: Optional[str] = None
    debug_created_by_secondary_split: bool = False
    debug_parent_split_bar_index: Optional[int] = None
    debug_parent_split_time: Optional[float] = None
    debug_split_source: Optional[str] = None
    section_progression_strength: float = 0.0


BarLike = Any


def _bar_start(bar: BarLike) -> float:
    value = getattr(bar, "start", None)
    if value is not None:
        return float(value)
    return float(bar[0])


def _bar_end(bar: BarLike) -> float:
    value = getattr(bar, "end", None)
    if value is not None:
        return float(value)
    return float(bar[1])


def _bar_index_for_time(bars: list[BarLike], target_time: float) -> int:
    if not bars:
        return 0

    target = float(target_time)
    for index, bar in enumerate(bars):
        if _bar_start(bar) <= target < _bar_end(bar):
            return index

    return max(0, len(bars) - 1)


def _section_bar_count(section: Section) -> int:
    return max(0, int(section.end_bar_index) - int(section.start_bar_index) + 1)


def _make_section(
    *,
    index: int,
    start_bar_index: int,
    end_bar_index: int,
    bars: list[BarLike],
    track_duration: float,
    debug_is_long_section_candidate: bool = False,
    debug_internal_peak_bar_indices: Optional[list[int]] = None,
    debug_internal_peak_times: Optional[list[float]] = None,
    debug_split_applied: bool = False,
    debug_candidate_evaluations: Optional[list[dict]] = None,
    debug_split_rejection_reason: Optional[str] = None,
    debug_created_by_secondary_split: bool = False,
    debug_parent_split_bar_index: Optional[int] = None,
    debug_parent_split_time: Optional[float] = None,
    debug_split_source: Optional[str] = None,
) -> DebugSection:
    start_index = max(0, int(start_bar_index))
    end_index = max(start_index, int(end_bar_index))

    start_time = _bar_start(bars[start_index]) if bars else 0.0
    if not bars:
        end_time = float(track_duration)
    elif end_index >= len(bars) - 1:
        end_time = float(track_duration)
    else:
        end_time = _bar_start(bars[end_index + 1])

    return DebugSection(
        index=int(index),
        start=float(start_time),
        end=float(end_time),
        start_bar_index=start_index,
        end_bar_index=end_index,
        duration_sec=float(max(0.0, end_time - start_time)),
        debug_is_long_section_candidate=bool(debug_is_long_section_candidate),
        debug_internal_peak_bar_indices=list(debug_internal_peak_bar_indices or []),
        debug_internal_peak_times=list(debug_internal_peak_times or []),
        debug_split_applied=bool(debug_split_applied),
        debug_candidate_evaluations=list(debug_candidate_evaluations or []),
        debug_split_rejection_reason=debug_split_rejection_reason,
        debug_created_by_secondary_split=bool(debug_created_by_secondary_split),
        debug_parent_split_bar_index=(
            int(debug_parent_split_bar_index)
            if debug_parent_split_bar_index is not None
            else None
        ),
        debug_parent_split_time=(
            float(debug_parent_split_time)
            if debug_parent_split_time is not None
            else None
        ),
        debug_split_source=debug_split_source,
    )


def _build_sections_from_boundary_indices(
    boundary_indices: list[int],
    bars: list[BarLike],
    track_duration: float,
) -> list[DebugSection]:
    if not bars:
        return [
            _make_section(
                index=0,
                start_bar_index=0,
                end_bar_index=0,
                bars=[],
                track_duration=track_duration,
            )
        ]

    start_indices = [0, *sorted(set(int(i) for i in boundary_indices if 0 < int(i) < len(bars)))]
    sections: list[DebugSection] = []

    for index, start_bar_index in enumerate(start_indices):
        if index + 1 < len(start_indices):
            end_bar_index = start_indices[index + 1] - 1
        else:
            end_bar_index = len(bars) - 1

        sections.append(
            _make_section(
                index=index,
                start_bar_index=start_bar_index,
                end_bar_index=end_bar_index,
                bars=bars,
                track_duration=track_duration,
            )
        )

    return sections


def _merge_sections(
    left: DebugSection,
    right: DebugSection,
    bars: list[BarLike],
    track_duration: float,
) -> DebugSection:
    return _make_section(
        index=left.index,
        start_bar_index=left.start_bar_index,
        end_bar_index=right.end_bar_index,
        bars=bars,
        track_duration=track_duration,
    )


def _boundary_strength(novelty_curve: list[float], boundary_start_bar_index: int) -> float:
    if not novelty_curve:
        return 0.0
    index = max(0, min(int(boundary_start_bar_index), len(novelty_curve) - 1))
    value = novelty_curve[index]
    return float(value) if value is not None else 0.0


def _cleanup_small_sections(
    sections: list[DebugSection],
    bars: list[BarLike],
    track_duration: float,
    novelty_curve: Optional[list[float]],
) -> list[DebugSection]:
    if len(sections) <= 1:
        return sections

    cleaned = sections[:]
    novelty = list(novelty_curve or [])

    changed = True
    while changed and len(cleaned) > 1:
        changed = False

        for index, section in enumerate(cleaned):
            if _section_bar_count(section) >= MIN_SECTION_BARS:
                continue

            if index == 0:
                cleaned[1] = _merge_sections(cleaned[0], cleaned[1], bars, track_duration)
                del cleaned[0]
                changed = True
                break

            if index == len(cleaned) - 1:
                cleaned[index - 1] = _merge_sections(
                    cleaned[index - 1],
                    cleaned[index],
                    bars,
                    track_duration,
                )
                del cleaned[index]
                changed = True
                break

            left_boundary_strength = _boundary_strength(novelty, section.start_bar_index)
            right_boundary_strength = _boundary_strength(
                novelty,
                cleaned[index + 1].start_bar_index,
            )

            if left_boundary_strength <= right_boundary_strength:
                cleaned[index - 1] = _merge_sections(
                    cleaned[index - 1],
                    cleaned[index],
                    bars,
                    track_duration,
                )
                del cleaned[index]
            else:
                cleaned[index + 1] = _merge_sections(
                    cleaned[index],
                    cleaned[index + 1],
                    bars,
                    track_duration,
                )
                del cleaned[index]

            changed = True
            break

    for index, section in enumerate(cleaned):
        section.index = int(index)

    return cleaned


def _collect_internal_split_candidates(
    section: DebugSection,
    bars: list[BarLike],
    novelty_curve: list[float],
    bar_feature_vectors: Optional[list[list[float]]] = None,
) -> tuple[list[int], list[dict], Optional[str]]:
    bar_count = _section_bar_count(section)
    if bar_count < LONG_SECTION_BARS:
        return [], [], "section_too_short_for_secondary_split"

    if not novelty_curve:
        return [], [], "missing_novelty_curve"

    start = int(section.start_bar_index) + SECONDARY_SPLIT_EDGE_GUARD_BARS
    end = int(section.end_bar_index) - SECONDARY_SPLIT_EDGE_GUARD_BARS + 1
    if start >= end:
        return [], [], "no_room_after_edge_guard"

    max_index = min(len(novelty_curve) - 1, len(bars) - 1, end - 1)
    if start > max_index:
        return [], [], "section_outside_novelty_range"

    search_indices = list(range(start, max_index + 1))
    search_values = [float(novelty_curve[i]) for i in search_indices]
    if not search_values:
        return [], [], "empty_internal_search_range"

    global_max = max(float(v) for v in novelty_curve) if novelty_curve else 0.0
    local_mean = mean(search_values)
    local_std = (
        sum((value - local_mean) ** 2 for value in search_values) / max(1, len(search_values))
    ) ** 0.5
    threshold = max(
        global_max * SECONDARY_SPLIT_MIN_PEAK_RATIO,
        local_mean + local_std * SECONDARY_SPLIT_STD_FACTOR,
    )

    candidates: list[int] = []
    evaluations: list[dict] = []
    novelty_values = novelty_curve

    for idx in search_indices:
        candidate_bar_index = int(idx)
        value = float(novelty_curve[idx])
        prev_value = float(novelty_curve[idx - 1]) if idx - 1 >= 0 else value
        next_value = float(novelty_curve[idx + 1]) if idx + 1 < len(novelty_curve) else value

        is_local_peak = value >= prev_value and value >= next_value
        accepted = bool(is_local_peak and value >= threshold)
        rejection_reason = None if accepted else "below_secondary_split_threshold"

        neighborhood_density = compute_neighborhood_density(
            novelty_values,
            idx,
            radius=2,
            relative_floor=0.5,
        )
        local_contrast = compute_local_contrast(
            novelty_values,
            idx,
            radius=2,
        )
        peak_dominance = compute_peak_dominance(
            novelty_curve=novelty_curve,
            center_index=candidate_bar_index,
            radius=4,
        )
        persistence_after_change = compute_persistence_after_change(
            bar_feature_vectors=bar_feature_vectors or [],
            center_index=candidate_bar_index,
            before_window=4,
            anchor_window=2,
            sustain_window=4,
        )
        state_change_strength = compute_state_change_strength(
            bar_feature_vectors=bar_feature_vectors or [],
            center_index=candidate_bar_index,
            before_window=4,
            after_window=2,
        )

        evaluations.append(
            build_secondary_split_candidate(
                bar_index=int(idx),
                time_sec=round(_bar_start(bars[idx]), 6),
                peak_strength=round(value, 6),
                accepted=accepted,
                rejection_reason=rejection_reason,
                neighborhood_density=round(neighborhood_density, 6),
                local_contrast=round(local_contrast, 6),
                peak_dominance=round(peak_dominance, 6),
                persistence_after_change=round(persistence_after_change, 6),
                state_change_strength=round(state_change_strength, 6),
            ).to_dict()
        )

        if accepted:
            candidates.append(int(idx))

    enriched_evaluations: list[dict] = []
    for item in evaluations:
        enriched_item = dict(item)
        enriched_item["transition_window_profile"] = compute_transition_window_profile(
            candidate_evaluations=evaluations,
            center_bar_index=int(item.get("bar_index", -1)),
            radius=1,
        )
        enriched_item["composite_transition_score"] = round(
            compute_composite_transition_score(enriched_item),
            6,
        )
        enriched_evaluations.append(enriched_item)

    evaluations = enriched_evaluations

    if not candidates:
        return [], evaluations, "no_strong_internal_peak"

    return candidates, evaluations, None


def _split_long_sections(
    sections: list[DebugSection],
    bars: list[BarLike],
    track_duration: float,
    novelty_curve: Optional[list[float]],
    bar_feature_vectors: Optional[list[list[float]]] = None,
) -> list[DebugSection]:
    novelty = list(novelty_curve or [])
    result: list[DebugSection] = []

    for section in sections:
        candidates, evaluations, rejection_reason = _collect_internal_split_candidates(
            section,
            bars,
            novelty,
            bar_feature_vectors=bar_feature_vectors,
        )
        is_long_candidate = _section_bar_count(section) >= LONG_SECTION_BARS

        if not candidates:
            section.debug_is_long_section_candidate = is_long_candidate
            section.debug_candidate_evaluations = evaluations
            section.debug_split_rejection_reason = (
                rejection_reason if is_long_candidate else None
            )
            result.append(section)
            continue

        selected_index = max(candidates, key=lambda idx: float(novelty[idx]))
        selected_time = _bar_start(bars[selected_index])

        left = _make_section(
            index=len(result),
            start_bar_index=section.start_bar_index,
            end_bar_index=selected_index - 1,
            bars=bars,
            track_duration=track_duration,
            debug_is_long_section_candidate=False,
            debug_internal_peak_bar_indices=[int(selected_index)],
            debug_internal_peak_times=[float(selected_time)],
            debug_split_applied=True,
            debug_candidate_evaluations=evaluations,
            debug_created_by_secondary_split=True,
            debug_parent_split_bar_index=int(selected_index),
            debug_parent_split_time=float(selected_time),
            debug_split_source="candidate_peak",
        )
        right = _make_section(
            index=len(result) + 1,
            start_bar_index=selected_index,
            end_bar_index=section.end_bar_index,
            bars=bars,
            track_duration=track_duration,
            debug_is_long_section_candidate=False,
            debug_internal_peak_bar_indices=[int(selected_index)],
            debug_internal_peak_times=[float(selected_time)],
            debug_split_applied=True,
            debug_candidate_evaluations=evaluations,
            debug_created_by_secondary_split=True,
            debug_parent_split_bar_index=int(selected_index),
            debug_parent_split_time=float(selected_time),
            debug_split_source="candidate_peak",
        )

        if (
            _section_bar_count(left) < MIN_SECTION_BARS
            or _section_bar_count(right) < MIN_SECTION_BARS
        ):
            section.debug_is_long_section_candidate = True
            section.debug_candidate_evaluations = evaluations
            section.debug_split_rejection_reason = "secondary_split_creates_too_small_child"
            result.append(section)
            continue

        result.extend([left, right])

    for index, section in enumerate(result):
        section.index = int(index)

    return result


def build_sections(
    bars: list[BarLike],
    boundary_candidates: list[float],
    track_duration: float,
    novelty_curve: Optional[list[float]] = None,
    feature_names: Optional[list[str]] = None,
    bar_feature_vectors: Optional[list[list[float]]] = None,
) -> list[Section]:
    duration = max(0.0, float(track_duration))
    if duration <= 0.0:
        return []

    if not bars:
        return [
            _make_section(
                index=0,
                start_bar_index=0,
                end_bar_index=0,
                bars=[],
                track_duration=duration,
            )
        ]

    raw_indices = sorted(
        set(
            _bar_index_for_time(bars, boundary_time)
            for boundary_time in boundary_candidates
            if 0.0 < float(boundary_time) < duration
        )
    )

    max_bar_index = len(bars) - 1
    boundary_indices = [
        int(index)
        for index in raw_indices
        if MIN_SECTION_BARS <= int(index) <= max_bar_index - MIN_SECTION_BARS
    ]

    sections = _build_sections_from_boundary_indices(boundary_indices, bars, duration)
    sections = _cleanup_small_sections(sections, bars, duration, novelty_curve)
    sections = _split_long_sections(
        sections,
        bars,
        duration,
        novelty_curve,
        bar_feature_vectors=bar_feature_vectors,
    )
    sections = _cleanup_small_sections(sections, bars, duration, novelty_curve)

    progression_strengths = compute_section_progression_strengths(
        sections=sections,
        bars=bars,
    )

    for index, section in enumerate(sections):
        section.index = int(index)
        section.section_progression_strength = round(
            float(progression_strengths.get(index, 0.0)),
            6,
        )

    return sections
