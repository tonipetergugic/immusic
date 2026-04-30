from __future__ import annotations

from math import isfinite
from typing import Any

from analysis_engine.section_character_summary import build_section_character_summary


def build_arrangement_development_summary(
    result: Any,
    section_character_summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not isinstance(section_character_summary, dict):
        section_character_summary = build_section_character_summary(result)

    if not isinstance(section_character_summary, dict):
        return {
            "status": "unavailable",
            "reason": "No section character summary available.",
        }

    if section_character_summary.get("status") != "available":
        return {
            "status": "unavailable",
            "reason": "No section character summary available.",
        }

    sections = section_character_summary.get("sections")
    if not isinstance(sections, list) or not sections:
        return {
            "status": "unavailable",
            "reason": "No section character summary available.",
        }

    overall = section_character_summary.get("overall")
    if isinstance(overall, dict):
        overall_energy_profile = _as_text(overall.get("energy_profile"))
        overall_density_profile = _as_text(overall.get("density_profile"))
    else:
        overall_energy_profile = "unknown"
        overall_density_profile = "unknown"

    energy_values = [_as_text(section.get("energy_level")) for section in sections if isinstance(section, dict)]
    density_values = [_as_text(section.get("density_level")) for section in sections if isinstance(section, dict)]
    movement_values = [_as_text(section.get("movement")) for section in sections if isinstance(section, dict)]
    role_values = [_as_text(section.get("relative_role")) for section in sections if isinstance(section, dict)]

    core_roles = [role for role in role_values if role not in {"opening_area", "closing_area"}]

    energy_variety = _variety_signal(set(energy_values) - {"unknown"})
    density_variety = _variety_signal(set(density_values) - {"unknown"})
    movement_variety = _variety_signal(set(movement_values) - {"unknown"})
    role_variety = _variety_signal(set(core_roles) - {"unknown"})

    variation_signal = _combine_variety(
        energy_variety=energy_variety,
        density_variety=density_variety,
        role_variety=role_variety,
        movement_variety=movement_variety,
        overall_energy_profile=overall_energy_profile,
        overall_density_profile=overall_density_profile,
    )

    structure = getattr(result, "structure", None)
    repetition_score = _as_number(getattr(structure, "repetition_score", None))
    contrast_score = _as_number(getattr(structure, "contrast_score", None))
    transition_score = _as_number(getattr(structure, "transition_score", None))

    development_signal = _development_signal(
        variation_signal=variation_signal,
        movement_values=movement_values,
        transition_score=transition_score,
        contrast_score=contrast_score,
    )
    journey_shape = _journey_shape(movement_values)
    possible_low_contrast_arrangement_focus = _possible_low_contrast_arrangement_focus(
        variation_signal=variation_signal,
        repetition_score=repetition_score,
        contrast_score=contrast_score,
    )
    (
        possible_extended_core_arrangement_span,
        extended_core_arrangement_span_evidence,
    ) = _possible_extended_core_arrangement_span(
        result=result,
        sections=sections,
    )

    return {
        "status": "available",
        "development_signal": development_signal,
        "variation_signal": variation_signal,
        "journey_shape": journey_shape,
        "possible_low_contrast_arrangement_focus": possible_low_contrast_arrangement_focus,
        "possible_extended_core_arrangement_span": possible_extended_core_arrangement_span,
        "extended_core_arrangement_span_evidence": extended_core_arrangement_span_evidence,
        "listening_check": _listening_check(
            development_signal=development_signal,
            possible_low_contrast_arrangement_focus=possible_low_contrast_arrangement_focus,
            possible_extended_core_arrangement_span=possible_extended_core_arrangement_span,
        ),
        "evidence": {
            "energy_variety": energy_variety,
            "density_variety": density_variety,
            "role_variety": role_variety,
            "movement_variety": movement_variety,
        },
        "wording_note": (
            "Use this only as cautious arrangement-development evidence. Do not treat it "
            "as proof of weak songwriting, repetitive melody, loop repetition, sample "
            "reuse, or missing drops/builds."
        ),
    }


def _as_text(value: Any) -> str:
    if isinstance(value, str) and value.strip():
        return value
    return "unknown"


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        if isfinite(number):
            return number
    return None


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def _format_mmss(seconds: float | None) -> str | None:
    if seconds is None:
        return None
    whole_seconds = int(seconds)
    if whole_seconds < 0:
        whole_seconds = 0
    minutes = whole_seconds // 60
    remaining_seconds = whole_seconds % 60
    return f"{minutes}:{remaining_seconds:02d}"


def _get(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        return value.get(key)
    return getattr(value, key, None)


def _track_duration_sec(result: Any, segments: list[Any]) -> float | None:
    for segment in reversed(segments):
        end_sec = _as_number(_get(segment, "end_sec"))
        if end_sec is not None and end_sec > 0:
            return end_sec

    file_info = getattr(result, "file_info", None)
    duration_from_file = _as_number(_get(file_info, "duration_sec"))
    if duration_from_file is not None and duration_from_file > 0:
        return duration_from_file

    summary = getattr(result, "summary", None)
    duration_from_summary = _as_number(_get(summary, "duration_sec"))
    if duration_from_summary is not None and duration_from_summary > 0:
        return duration_from_summary

    return None


def _possible_extended_core_arrangement_span(
    *,
    result: Any,
    sections: list[Any],
) -> tuple[bool, dict[str, Any] | None]:
    structure = getattr(result, "structure", None)
    segments = _get(structure, "segments")
    if not isinstance(segments, list) or not segments:
        return False, None

    track_duration_sec = _track_duration_sec(result, segments)

    for list_index, segment in enumerate(segments):
        section = sections[list_index] if list_index < len(sections) and isinstance(sections[list_index], dict) else {}
        relative_role = _as_text(section.get("relative_role"))
        if relative_role in {"opening_area", "closing_area"}:
            continue

        start_sec = _as_number(_get(segment, "start_sec"))
        end_sec = _as_number(_get(segment, "end_sec"))
        duration_sec = None
        if start_sec is not None and end_sec is not None:
            duration_sec = max(0.0, end_sec - start_sec)
        start_time = _format_mmss(start_sec)
        end_time = _format_mmss(end_sec)

        duration_share = None
        if (
            duration_sec is not None
            and track_duration_sec is not None
            and track_duration_sec > 0
        ):
            duration_share = duration_sec / track_duration_sec

        is_extended = (
            (duration_share is not None and duration_share >= 0.35)
            or (duration_sec is not None and duration_sec >= 70.0)
        )
        if not is_extended:
            continue

        segment_index = _as_int(_get(segment, "index"))
        if segment_index is None:
            segment_index = list_index

        start_bar = _as_int(_get(segment, "start_bar"))
        end_bar = _as_int(_get(segment, "end_bar"))
        bars = None
        if start_bar is not None and end_bar is not None and end_bar >= start_bar:
            bars = end_bar - start_bar + 1

        return True, {
            "segment_index": segment_index,
            "start_sec": start_sec,
            "end_sec": end_sec,
            "start_time": start_time,
            "end_time": end_time,
            "duration_sec": duration_sec,
            "duration_share": duration_share,
            "bars": bars,
            "relative_role": relative_role,
            "movement": _as_text(section.get("movement")),
            "energy_level": _as_text(section.get("energy_level")),
            "density_level": _as_text(section.get("density_level")),
        }

    return False, None


def _variety_signal(values: set[str]) -> str:
    count = len(values)
    if count <= 1:
        return "low"
    if count == 2:
        return "moderate"
    return "varied"


def _combine_variety(
    *,
    energy_variety: str,
    density_variety: str,
    role_variety: str,
    movement_variety: str,
    overall_energy_profile: str,
    overall_density_profile: str,
) -> str:
    score = (
        _variety_points(energy_variety)
        + _variety_points(density_variety)
        + _variety_points(role_variety)
        + _variety_points(movement_variety)
    )

    if overall_energy_profile in {"varied", "moderate_movement"}:
        score += 1
    if overall_density_profile in {"varied", "moderate_movement"}:
        score += 1

    if score <= 3:
        return "low"
    if score <= 6:
        return "moderate"
    return "varied"


def _variety_points(signal: str) -> int:
    return {"low": 0, "moderate": 1, "varied": 2}.get(signal, 0)


def _development_signal(
    *,
    variation_signal: str,
    movement_values: list[str],
    transition_score: float | None,
    contrast_score: float | None,
) -> str:
    points = {"low": 0, "moderate": 1, "varied": 2}.get(variation_signal, 0)

    movement_set = set(movement_values) - {"unknown"}
    if "changing" in movement_set:
        points += 1
    if "rising" in movement_set and "falling" in movement_set:
        points += 1

    if transition_score is not None and transition_score >= 0.7:
        points += 1
    if contrast_score is not None and contrast_score >= 0.45:
        points += 1

    if points <= 1:
        return "limited"
    if points <= 4:
        return "moderate"
    return "noticeable"


def _journey_shape(movement_values: list[str]) -> str:
    movement_set = set(movement_values) - {"unknown"}
    if not movement_set or movement_set == {"stable"}:
        return "mostly_stable"
    if "rising" in movement_set and "falling" in movement_set:
        if "stable" in movement_set or "changing" in movement_set:
            return "alternating"
        return "changing"
    if movement_set <= {"rising", "stable"}:
        return "building"
    if movement_set <= {"falling", "stable"}:
        return "reducing"
    return "changing"


def _possible_low_contrast_arrangement_focus(
    *,
    variation_signal: str,
    repetition_score: float | None,
    contrast_score: float | None,
) -> bool:
    if variation_signal not in {"low", "moderate"}:
        return False

    if repetition_score is not None and repetition_score >= 0.7:
        return True

    if contrast_score is not None and contrast_score < 0.35:
        return True

    return False


def _listening_check(
    *,
    development_signal: str,
    possible_low_contrast_arrangement_focus: bool,
    possible_extended_core_arrangement_span: bool,
) -> str:
    if possible_extended_core_arrangement_span:
        return (
            "Check whether one larger central arrangement area stays similar for long "
            "enough that the track may need more noticeable development, variation, "
            "or a memorable lift."
        )

    if possible_low_contrast_arrangement_focus:
        return (
            "Check whether the larger arrangement arc introduces enough new tension, "
            "variation, or a memorable lift over time."
        )

    if development_signal == "noticeable":
        return (
            "The larger arrangement areas suggest a noticeable sense of progression, "
            "but final judgment should still come from listening."
        )

    return (
        "Check whether the larger arrangement arc introduces enough new tension, "
        "variation, or a memorable lift over time."
    )
