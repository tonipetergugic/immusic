from __future__ import annotations

from dataclasses import asdict
from typing import Any, Mapping

from analysis_engine.artist_decision_payload import build_artist_decision_payload
from analysis_engine.schemas import AnalysisResult


ARTIST_FEEDBACK_PAYLOAD_SCHEMA = "artist_feedback_payload"
AI_CONSULTANT_SUMMARY_FILENAME = "ai_consultant_summary.md"


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return []


def _build_decision_payload(
    result: AnalysisResult,
    artist_decision_payload: Mapping[str, Any] | None,
) -> dict[str, Any]:
    if artist_decision_payload is not None:
        return dict(artist_decision_payload)

    return build_artist_decision_payload(result.to_dict())


def _build_release_summary(decision_payload: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "track_status": _as_dict(decision_payload.get("track_status")),
        "release_readiness": _as_dict(decision_payload.get("release_readiness")),
        "critical_warnings": _as_list(decision_payload.get("critical_warnings")),
        "technical_release_checks": _as_list(decision_payload.get("technical_release_checks")),
        "next_step": _as_dict(decision_payload.get("next_step")),
    }


def _build_track(result: AnalysisResult) -> dict[str, Any]:
    return {
        "title": result.file_info.filename,
        "filename": result.file_info.filename,
        "duration_sec": result.file_info.duration_sec,
        "sample_rate": result.file_info.sample_rate,
        "channels": result.file_info.channels,
    }


def _build_track_from_analysis_dict(analysis_payload: Mapping[str, Any]) -> dict[str, Any]:
    file_info = _as_dict(analysis_payload.get("file_info"))

    return {
        "title": file_info.get("filename"),
        "filename": file_info.get("filename"),
        "duration_sec": file_info.get("duration_sec"),
        "sample_rate": file_info.get("sample_rate"),
        "channels": file_info.get("channels"),
    }


def _build_artist_guidance(consultant_input: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "structure_summary": _as_dict(consultant_input.get("structure_summary")),
        "section_character_summary": _as_dict(consultant_input.get("section_character_summary")),
        "arrangement_development_summary": _as_dict(
            consultant_input.get("arrangement_development_summary")
        ),
        "musical_flow_summary": _as_dict(consultant_input.get("musical_flow_summary")),
        "score_context": _as_dict(consultant_input.get("score_context")),
    }


def _build_engine_signals(consultant_input: Mapping[str, Any]) -> dict[str, Any]:
    structure_summary = _as_dict(consultant_input.get("structure_summary"))

    return {
        "structure_scores": _as_dict(consultant_input.get("structure")),
        "readable_structure_signals": _as_dict(structure_summary.get("readable_signals")),
        "sections": _as_list(structure_summary.get("sections")),
    }


def _build_extended_core_arrangement_guidance(
    arrangement_development_summary: Mapping[str, Any],
) -> dict[str, Any] | None:
    if not bool(
        arrangement_development_summary.get("possible_extended_core_arrangement_span")
    ):
        return None

    evidence = _as_dict(
        arrangement_development_summary.get("extended_core_arrangement_span_evidence")
    )

    return {
        "id": "possible_extended_core_arrangement_span",
        "area": "arrangement",
        "priority": "medium",
        "confidence": "medium",
        "headline": "Check whether the central arrangement area develops enough",
        "what_to_listen_for": (
            "Listen to this longer central passage and check whether it creates enough "
            "development, variation, tension, or a clear lift for the declared genre."
        ),
        "evidence": {
            "source_signal": (
                "arrangement_development_summary."
                "possible_extended_core_arrangement_span"
            ),
            "time_range": {
                "start_sec": evidence.get("start_sec"),
                "end_sec": evidence.get("end_sec"),
                "start_time": evidence.get("start_time"),
                "end_time": evidence.get("end_time"),
            },
            "duration_sec": evidence.get("duration_sec"),
            "duration_share": evidence.get("duration_share"),
            "bars": evidence.get("bars"),
            "relative_role": evidence.get("relative_role"),
            "movement": evidence.get("movement"),
            "energy_level": evidence.get("energy_level"),
            "density_level": evidence.get("density_level"),
        },
        "wording_note": (
            "Use this as cautious listening guidance only. Do not present it as proof "
            "of weak songwriting, repetitive melody, sample reuse, or missing drops/builds."
        ),
    }


def _to_optional_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    try:
        return float(str(value))
    except (TypeError, ValueError):
        return None


def _format_time_mm_ss(value: Any) -> str | None:
    seconds_value = _to_optional_float(value)
    if seconds_value is None:
        return None

    total_seconds = int(round(seconds_value))
    if total_seconds < 0:
        return None

    minutes, seconds = divmod(total_seconds, 60)
    return f"{minutes}:{seconds:02d}"


def _build_section_timeline(
    section_character_summary: Mapping[str, Any],
    engine_sections: Any,
) -> list[dict[str, Any]]:
    character_sections = section_character_summary.get("sections")

    if not isinstance(character_sections, list):
        return []

    if not isinstance(engine_sections, list):
        return []

    timeline: list[dict[str, Any]] = []

    section_count = min(len(character_sections), len(engine_sections))

    for fallback_index in range(section_count):
        character_section = character_sections[fallback_index]
        engine_section = engine_sections[fallback_index]

        if not isinstance(character_section, Mapping):
            continue

        if not isinstance(engine_section, Mapping):
            continue

        start_sec = _to_optional_float(engine_section.get("start_sec"))
        end_sec = _to_optional_float(engine_section.get("end_sec"))

        time_range: dict[str, Any] = {}

        if start_sec is not None:
            time_range["start_sec"] = start_sec
            start_time = _format_time_mm_ss(start_sec)
            if start_time is not None:
                time_range["start_time"] = start_time

        if end_sec is not None:
            time_range["end_sec"] = end_sec
            end_time = _format_time_mm_ss(end_sec)
            if end_time is not None:
                time_range["end_time"] = end_time

        item: dict[str, Any] = {
            "index": engine_section.get("index", fallback_index),
            "position": character_section.get("position"),
            "duration_character": character_section.get("duration_character"),
            "energy_level": character_section.get("energy_level"),
            "density_level": character_section.get("density_level"),
            "movement": character_section.get("movement"),
            "relative_role": character_section.get("relative_role"),
        }

        if time_range:
            item["time_range"] = time_range

        if start_sec is not None and end_sec is not None and end_sec >= start_sec:
            item["duration_sec"] = end_sec - start_sec

        timeline.append(item)

    return timeline


def _build_musical_flow_evidence(
    musical_flow_summary: Mapping[str, Any],
) -> dict[str, Any]:
    evidence_summary = _as_dict(musical_flow_summary.get("evidence_summary"))
    energy_direction = _as_dict(evidence_summary.get("energy_direction"))
    density_direction = _as_dict(evidence_summary.get("density_direction"))

    return {
        "source_signal": "musical_flow_summary.movement_profile",
        "movement_profile": musical_flow_summary.get("movement_profile"),
        "movement_signal": musical_flow_summary.get("movement_signal"),
        "energy_movement": musical_flow_summary.get("energy_movement"),
        "energy_direction": musical_flow_summary.get("energy_direction"),
        "density_movement": musical_flow_summary.get("density_movement"),
        "density_direction": musical_flow_summary.get("density_direction"),
        "energy_range_lu": evidence_summary.get("energy_range_lu"),
        "density_cv": evidence_summary.get("density_cv"),
        "energy_delta_lu": energy_direction.get("delta_lu"),
        "density_delta_per_sec": density_direction.get("delta_density_per_sec"),
    }


def _build_musical_flow_guidance(
    musical_flow_summary: Mapping[str, Any],
) -> dict[str, Any] | None:
    movement_profile = musical_flow_summary.get("movement_profile")
    evidence = _build_musical_flow_evidence(musical_flow_summary)

    energy_delta_lu = _to_optional_float(evidence.get("energy_delta_lu"))
    density_delta_per_sec = _to_optional_float(evidence.get("density_delta_per_sec"))
    energy_range_lu = _to_optional_float(evidence.get("energy_range_lu"))
    density_cv = _to_optional_float(evidence.get("density_cv"))

    if (
        movement_profile == "energy_lift_with_limited_density_lift"
        and energy_delta_lu is not None
        and density_delta_per_sec is not None
        and energy_delta_lu >= 1.5
        and density_delta_per_sec <= 0.5
    ):
        return {
            "id": "energy_lift_with_limited_density_lift",
            "area": "musical_flow",
            "priority": "medium",
            "confidence": "medium",
            "headline": "Check whether the energy lift has enough musical support",
            "what_to_listen_for": (
                "Listen for whether the energy lift is also supported by enough "
                "arrangement, density, tension, or a memorable musical development, "
                "especially in transitions and central sections."
            ),
            "evidence": evidence,
            "wording_note": (
                "Use this as cautious listening guidance only. Do not present it as "
                "proof of weak songwriting, missing drops/builds, or insufficient musical quality."
            ),
        }

    if (
        movement_profile == "variable_without_clear_lift"
        and (
            (energy_range_lu is not None and energy_range_lu >= 4.0)
            or (density_cv is not None and density_cv >= 0.35)
        )
    ):
        return {
            "id": "variable_without_clear_lift",
            "area": "musical_flow",
            "priority": "medium",
            "confidence": "medium",
            "headline": "Check whether the movement feels purposeful",
            "what_to_listen_for": (
                "Listen for whether the movement feels like purposeful development "
                "over time, not only local variation."
            ),
            "evidence": evidence,
            "wording_note": (
                "Use this as cautious listening guidance only. Do not diagnose melody, "
                "loop, sample, or songwriting repetition from this summary."
            ),
        }

    if (
        movement_profile == "mixed_motion"
        and energy_delta_lu is not None
        and abs(energy_delta_lu) <= 0.75
        and (
            (density_delta_per_sec is not None and density_delta_per_sec <= -1.0)
            or (density_cv is not None and density_cv >= 0.55)
        )
    ):
        return {
            "id": "mixed_motion_density_check",
            "area": "musical_flow",
            "priority": "low",
            "confidence": "low",
            "headline": "Reference-check whether the density movement feels intentional",
            "what_to_listen_for": (
                "Use a normal reference listening pass to confirm that the changing "
                "density feels intentional and natural for the declared genre."
            ),
            "evidence": evidence,
            "wording_note": (
                "Use this only as a low-priority listening check. Mixed movement can be "
                "fully intentional and should not be framed as a problem by itself."
            ),
        }

    return None


def _build_section_timeline_extended_reduced_middle_guidance(
    section_timeline: Any,
) -> dict[str, Any] | None:
    if not isinstance(section_timeline, list):
        return None

    matching_sections: list[dict[str, Any]] = []
    for section in section_timeline:
        if not isinstance(section, Mapping):
            continue
        if (
            section.get("position") == "middle"
            and section.get("duration_character") == "extended"
            and section.get("relative_role") == "reduced_area"
        ):
            matching_sections.append(dict(section))

    if not matching_sections:
        return None

    def _sort_key(section: Mapping[str, Any]) -> tuple[float, int]:
        duration = _to_optional_float(section.get("duration_sec"))
        if duration is None:
            duration = -1.0

        index_value = section.get("index")
        if isinstance(index_value, bool):
            index = 10**9
        elif isinstance(index_value, int):
            index = index_value
        else:
            try:
                index = int(str(index_value))
            except (TypeError, ValueError):
                index = 10**9

        return (-duration, index)

    section = sorted(matching_sections, key=_sort_key)[0]

    return {
        "id": "section_timeline_extended_reduced_middle_check",
        "area": "arrangement",
        "priority": "medium",
        "confidence": "medium",
        "headline": "Check whether the extended middle section develops enough over time",
        "what_to_listen_for": "Listen to this longer middle section and check whether development, variation, tension, or contrast stays sufficient for the declared genre.",
        "evidence": {
            "source_signal": "artist_guidance.section_timeline",
            "section_index": section.get("index"),
            "time_range": section.get("time_range"),
            "duration_sec": section.get("duration_sec"),
            "position": section.get("position"),
            "duration_character": section.get("duration_character"),
            "relative_role": section.get("relative_role"),
            "movement": section.get("movement"),
            "energy_level": section.get("energy_level"),
            "density_level": section.get("density_level"),
        },
        "wording_note": "Use this as cautious listening guidance only. Do not present it as proof of weak songwriting, missing drops/builds, or low artistic quality.",
    }


def _build_listening_guidance(
    consultant_input: Mapping[str, Any],
    section_timeline: Any | None = None,
) -> list[dict[str, Any]]:
    arrangement_development_summary = _as_dict(
        consultant_input.get("arrangement_development_summary")
    )
    musical_flow_summary = _as_dict(consultant_input.get("musical_flow_summary"))

    guidance: list[dict[str, Any]] = []

    extended_core_guidance = _build_extended_core_arrangement_guidance(
        arrangement_development_summary
    )
    if extended_core_guidance is not None:
        guidance.append(extended_core_guidance)

    musical_flow_guidance = _build_musical_flow_guidance(musical_flow_summary)
    if musical_flow_guidance is not None:
        guidance.append(musical_flow_guidance)

    if extended_core_guidance is None:
        section_timeline_guidance = _build_section_timeline_extended_reduced_middle_guidance(
            section_timeline
        )
        if section_timeline_guidance is not None:
            guidance.append(section_timeline_guidance)

    return guidance


def _clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    stripped = value.strip()
    if not stripped:
        return None

    return stripped


def _clean_confidence(value: Any) -> str | None:
    confidence = _clean_text(value)
    if confidence in {"high", "medium", "low"}:
        return confidence

    return None


def _first_mapping_item(items: Any) -> Mapping[str, Any] | None:
    if not isinstance(items, list):
        return None

    for item in items:
        if isinstance(item, Mapping):
            return item

    return None


def _structure_overview_text_for_movement_profile(value: Any) -> str | None:
    movement_profile = _clean_text(value)

    text_by_profile = {
        "combined_lift": (
            "The track appears to build energy and density together over time."
        ),
        "energy_lift_with_limited_density_lift": (
            "The energy appears to rise more clearly than the density or arrangement movement."
        ),
        "density_lift_with_limited_energy_lift": (
            "The density appears to increase more clearly than the overall energy lift."
        ),
        "variable_without_clear_lift": (
            "The track shows variation, but the larger lift may be less clearly defined."
        ),
        "mostly_stable": (
            "The track appears to stay relatively stable across the main sections."
        ),
        "mixed_motion": (
            "The track shows changing movement patterns across different sections."
        ),
        "shared_release": (
            "Energy and density appear to reduce together across parts of the arrangement."
        ),
        "unavailable": (
            "There is not enough reliable movement information to summarize the structure safely."
        ),
    }

    return text_by_profile.get(movement_profile)


def _structure_overview_text_for_journey_shape(value: Any) -> str | None:
    journey_shape = _clean_text(value)

    text_by_shape = {
        "alternating": (
            "The track appears to move through alternating rises, reductions, or stable areas."
        ),
        "changing": "The track shows changing movement across the arrangement.",
        "building": "The arrangement appears to build over time.",
        "reducing": "The arrangement appears to reduce or release energy over time.",
        "mostly_stable": (
            "The arrangement appears mostly stable across the main sections."
        ),
    }

    return text_by_shape.get(journey_shape)


def _structure_overview_text_for_section_overall(
    section_character_summary: Mapping[str, Any],
) -> str | None:
    overall = _as_dict(section_character_summary.get("overall"))

    energy_profile = _clean_text(overall.get("energy_profile"))
    density_profile = _clean_text(overall.get("density_profile"))

    if energy_profile == "varied" and density_profile == "varied":
        return "Several sections appear to have distinguishable energy and density character."

    if energy_profile == "varied":
        return "Several sections appear to have distinguishable energy movement."

    if density_profile == "varied":
        return "Several sections appear to have distinguishable density movement."

    if energy_profile == "stable" and density_profile == "stable":
        return "The main sections appear relatively stable in energy and density."

    return None


def _structure_overview_time_range_from_guidance(
    listening_guidance: Any,
) -> Mapping[str, Any] | None:
    if not isinstance(listening_guidance, list):
        return None

    for item in listening_guidance:
        if not isinstance(item, Mapping):
            continue

        evidence = _as_dict(item.get("evidence"))
        time_range = _as_dict(evidence.get("time_range"))

        if _clean_text(time_range.get("start_time")) and _clean_text(
            time_range.get("end_time")
        ):
            return time_range

    return None


def _structure_overview_time_range_from_extended_core(
    arrangement_development_summary: Mapping[str, Any],
) -> Mapping[str, Any] | None:
    evidence = _as_dict(
        arrangement_development_summary.get("extended_core_arrangement_span_evidence")
    )

    start_time = _clean_text(evidence.get("start_time"))
    end_time = _clean_text(evidence.get("end_time"))

    if start_time and end_time:
        return {
            "start_time": start_time,
            "end_time": end_time,
        }

    return None


def _structure_overview_time_range_from_section_timeline(
    section_timeline: Any,
) -> Mapping[str, Any] | None:
    if not isinstance(section_timeline, list):
        return None

    candidates: list[Mapping[str, Any]] = []

    for section in section_timeline:
        if not isinstance(section, Mapping):
            continue

        if section.get("duration_character") != "extended":
            continue

        time_range = _as_dict(section.get("time_range"))
        if not _clean_text(time_range.get("start_time")):
            continue
        if not _clean_text(time_range.get("end_time")):
            continue

        candidates.append(section)

    if not candidates:
        return None

    def _sort_key(section: Mapping[str, Any]) -> tuple[float, int]:
        duration = _to_optional_float(section.get("duration_sec"))
        if duration is None:
            duration = -1.0

        index_value = section.get("index")
        if isinstance(index_value, bool):
            index = 10**9
        elif isinstance(index_value, int):
            index = index_value
        else:
            try:
                index = int(str(index_value))
            except (TypeError, ValueError):
                index = 10**9

        return (-duration, index)

    selected = sorted(candidates, key=_sort_key)[0]
    return _as_dict(selected.get("time_range"))


def _build_structure_overview_timeline_hint(
    listening_guidance: Any,
    arrangement_development_summary: Mapping[str, Any],
    section_timeline: Any,
) -> str | None:
    time_range = (
        _structure_overview_time_range_from_guidance(listening_guidance)
        or _structure_overview_time_range_from_extended_core(
            arrangement_development_summary
        )
        or _structure_overview_time_range_from_section_timeline(section_timeline)
    )

    if time_range is None:
        return None

    start_time = _clean_text(time_range.get("start_time"))
    end_time = _clean_text(time_range.get("end_time"))

    if not start_time or not end_time:
        return None

    return (
        f"The span from {start_time} to {end_time} may be worth checking for "
        "perceived variation, tension, or progression."
    )


def _build_structure_overview(
    artist_guidance: Mapping[str, Any],
    listening_guidance: Any,
) -> dict[str, Any]:
    musical_flow_summary = _as_dict(artist_guidance.get("musical_flow_summary"))
    arrangement_development_summary = _as_dict(
        artist_guidance.get("arrangement_development_summary")
    )
    section_character_summary = _as_dict(
        artist_guidance.get("section_character_summary")
    )
    section_timeline = artist_guidance.get("section_timeline")

    first_guidance = _first_mapping_item(listening_guidance)

    if first_guidance is not None:
        status = "available"
    elif musical_flow_summary.get("status") == "available":
        status = "available"
    elif isinstance(section_timeline, list) and section_timeline:
        status = "limited"
    else:
        status = "unavailable"

    headline = None
    if first_guidance is not None:
        headline = _clean_text(first_guidance.get("headline"))

    if headline is None:
        headline = _structure_overview_text_for_movement_profile(
            musical_flow_summary.get("movement_profile")
        )

    if headline is None:
        headline = _structure_overview_text_for_journey_shape(
            arrangement_development_summary.get("journey_shape")
        )

    if headline is None:
        headline = (
            "The track structure has enough information for a focused listening check."
            if status != "unavailable"
            else "There is not enough structure information for a reliable overview."
        )

    main_observation = (
        _structure_overview_text_for_movement_profile(
            musical_flow_summary.get("movement_profile")
        )
        or _structure_overview_text_for_journey_shape(
            arrangement_development_summary.get("journey_shape")
        )
        or _structure_overview_text_for_section_overall(section_character_summary)
        or (
            "The available structure data can help guide a focused listening pass, "
            "but it should not be treated as a fixed musical judgment."
        )
    )

    if main_observation == headline:
        main_observation = (
            _structure_overview_text_for_journey_shape(
                arrangement_development_summary.get("journey_shape")
            )
            or _structure_overview_text_for_section_overall(section_character_summary)
            or (
                "The available structure data can help guide a focused listening pass "
                "without acting as a fixed musical judgment."
            )
        )

    listening_focus = None
    if first_guidance is not None:
        listening_focus = _clean_text(first_guidance.get("what_to_listen_for"))

    if listening_focus is None:
        listening_focus = _clean_text(
            arrangement_development_summary.get("listening_check")
        )

    if listening_focus is None:
        listening_focus = _clean_text(musical_flow_summary.get("listening_check"))

    if listening_focus is None:
        listening_focus = (
            "Listen through the main sections and check whether the structure, "
            "energy movement, and perceived development feel intentional for the "
            "declared genre."
        )

    timeline_hint = _build_structure_overview_timeline_hint(
        listening_guidance,
        arrangement_development_summary,
        section_timeline,
    )

    confidence = None
    if first_guidance is not None:
        confidence = _clean_confidence(first_guidance.get("confidence"))

    if confidence is None:
        confidence = "low" if status == "unavailable" else "medium"

    overview = {
        "status": status,
        "headline": headline,
        "main_observation": main_observation,
        "listening_focus": listening_focus,
        "confidence": confidence,
    }

    if timeline_hint is not None:
        overview["timeline_hint"] = timeline_hint

    return overview


_TECHNICAL_OVERVIEW_AREA_PRIORITY = {
    "file": 0,
    "peaks": 1,
    "loudness": 2,
    "low_end": 3,
    "dynamics": 4,
    "stereo": 5,
}


def _technical_overview_check_state(check: Mapping[str, Any]) -> str:
    state = _clean_text(check.get("state"))
    if state in {"problem", "warning", "ok", "unavailable"}:
        return state

    return "unavailable"


def _technical_overview_area_priority(area: Any) -> int:
    cleaned_area = _clean_text(area)
    if cleaned_area is None:
        return 10**6

    return _TECHNICAL_OVERVIEW_AREA_PRIORITY.get(cleaned_area, 10**6)


def _technical_overview_selected_check(
    technical_release_checks: Any,
) -> Mapping[str, Any] | None:
    if not isinstance(technical_release_checks, list):
        return None

    candidates: list[tuple[int, int, int, Mapping[str, Any]]] = []

    for index, item in enumerate(technical_release_checks):
        if not isinstance(item, dict):
            continue

        state = _technical_overview_check_state(item)
        if state not in {"problem", "warning"}:
            continue

        state_priority = 0 if state == "problem" else 1
        area_priority = _technical_overview_area_priority(item.get("area"))
        candidates.append((state_priority, area_priority, index, item))

    if not candidates:
        return None

    return sorted(candidates, key=lambda item: item[:3])[0][3]


def _technical_overview_status(release_summary: Mapping[str, Any]) -> str:
    release_readiness = _as_dict(release_summary.get("release_readiness"))
    readiness_state = _clean_text(release_readiness.get("state"))

    critical_warnings = release_summary.get("critical_warnings")
    technical_release_checks = release_summary.get("technical_release_checks")

    if not isinstance(technical_release_checks, list) or not technical_release_checks:
        return "unavailable"

    check_states = [
        _technical_overview_check_state(item)
        for item in technical_release_checks
        if isinstance(item, dict)
    ]

    critical_warning_severities: list[str] = []
    if isinstance(critical_warnings, list):
        for item in critical_warnings:
            if not isinstance(item, dict):
                continue

            severity = _clean_text(item.get("severity"))
            if severity is not None:
                critical_warning_severities.append(severity)

    if (
        readiness_state == "blocked"
        or "problem" in check_states
        or any(
            severity in {"problem", "error", "blocker"}
            for severity in critical_warning_severities
        )
    ):
        return "problem"

    if (
        readiness_state in {"needs_revision", "almost_ready"}
        or "warning" in check_states
        or bool(critical_warning_severities)
    ):
        return "warning"

    available_states = [
        state
        for state in check_states
        if state != "unavailable"
    ]

    if not available_states:
        return "unavailable"

    return "ok"


def _technical_overview_confidence(technical_release_checks: Any) -> str:
    if not isinstance(technical_release_checks, list) or not technical_release_checks:
        return "low"

    available_areas = {
        _clean_text(item.get("area"))
        for item in technical_release_checks
        if isinstance(item, dict)
        and _technical_overview_check_state(item) != "unavailable"
    }
    available_areas.discard(None)

    core_areas = {"loudness", "peaks", "dynamics", "stereo", "low_end", "file"}

    if core_areas.issubset(available_areas):
        return "high"

    if (
        {"loudness", "peaks", "dynamics"}.issubset(available_areas)
        and bool({"stereo", "low_end"} & available_areas)
    ):
        return "medium"

    if len(available_areas) >= 3:
        return "medium"

    return "low"


def _technical_overview_headline(status: str) -> str:
    if status == "problem":
        return (
            "The track shows a technical release risk that should be reviewed "
            "before publishing."
        )

    if status == "warning":
        return (
            "The track looks close, but one technical point should be checked "
            "before release."
        )

    if status == "unavailable":
        return "The technical release check is incomplete."

    return "No major technical release risks are visible in the available checks."


def _technical_overview_main_observation(
    selected_check: Mapping[str, Any] | None,
    status: str,
) -> str:
    if status == "unavailable":
        return "There is not enough technical release data for a reliable overview."

    if selected_check is None:
        return "The available technical checks do not show a major release risk."

    short_text = _clean_text(selected_check.get("short_text"))
    if short_text is not None:
        return short_text

    area = _clean_text(selected_check.get("area"))

    if area == "peaks":
        return "The main technical point is peak safety or export headroom."

    if area == "loudness":
        return "The main technical point is the overall master level."

    if area == "low_end":
        return "The main technical point is low-end stability, especially in mono."

    if area == "dynamics":
        return (
            "The main technical point is whether the master feels too compressed "
            "or limited."
        )

    if area == "stereo":
        return "The main technical point is stereo phase or mono compatibility."

    if area == "file":
        return "The main technical point is the uploaded source file."

    return "One technical release check should be reviewed before publishing."


def _technical_overview_listening_focus(
    selected_check: Mapping[str, Any] | None,
    status: str,
) -> str:
    if status == "unavailable":
        return "Run or refresh the technical check before making a release decision."

    if selected_check is None:
        return (
            "Do one final listening pass on your target playback systems before "
            "release."
        )

    area = _clean_text(selected_check.get("area"))

    if area in {"peaks", "loudness"}:
        return (
            "Listen to the loudest section and check whether the master feels "
            "strained, harsh, or clipped."
        )

    if area == "low_end":
        return (
            "Check the bass in mono and on smaller speakers to confirm that it "
            "remains stable."
        )

    if area == "dynamics":
        return (
            "Listen for loss of punch, flattened impact, or limiter pressure in "
            "the loudest parts."
        )

    if area == "stereo":
        return (
            "Check the track in mono and confirm that important elements do not "
            "disappear or feel unstable."
        )

    if area == "file":
        return "Listen for technical artifacts that may come from the source file."

    return "Do one focused technical listening pass before release."


def _technical_overview_export_focus(
    selected_check: Mapping[str, Any] | None,
    status: str,
) -> str:
    if status == "unavailable":
        return "Run the technical release check again before exporting the final master."

    if selected_check is None:
        return (
            "No specific export correction is suggested from the available "
            "technical checks."
        )

    area = _clean_text(selected_check.get("area"))

    if area in {"peaks", "loudness"}:
        return (
            "Review the final limiter or export level and leave safer peak "
            "headroom."
        )

    if area == "low_end":
        return "Check low-end mono compatibility before exporting the final master."

    if area == "dynamics":
        return "Review limiter pressure and dynamic impact before exporting."

    if area == "stereo":
        return "Check mono compatibility before final export."

    if area == "file":
        return "Export or upload a clean source file and run the check again."

    return "Review the highlighted technical check before final export."


def _build_technical_overview(
    release_summary: Mapping[str, Any],
) -> dict[str, Any]:
    technical_release_checks = release_summary.get("technical_release_checks")
    selected_check = _technical_overview_selected_check(technical_release_checks)
    status = _technical_overview_status(release_summary)

    return {
        "status": status,
        "headline": _technical_overview_headline(status),
        "main_observation": _technical_overview_main_observation(
            selected_check,
            status,
        ),
        "listening_focus": _technical_overview_listening_focus(
            selected_check,
            status,
        ),
        "export_focus": _technical_overview_export_focus(
            selected_check,
            status,
        ),
        "confidence": _technical_overview_confidence(technical_release_checks),
    }


def _build_technical_details(result: AnalysisResult) -> dict[str, Any]:
    return {
        "loudness": asdict(result.loudness),
        "dynamics": asdict(result.dynamics),
        "stereo": asdict(result.stereo),
        "low_end": asdict(result.low_end),
        "limiter_stress": asdict(result.limiter_stress),
        "spectral_rms": asdict(result.spectral_rms),
        "transients": asdict(result.transients),
    }


def _build_technical_details_from_analysis_dict(
    analysis_payload: Mapping[str, Any],
) -> dict[str, Any]:
    return {
        "loudness": _as_dict(analysis_payload.get("loudness")),
        "dynamics": _as_dict(analysis_payload.get("dynamics")),
        "stereo": _as_dict(analysis_payload.get("stereo")),
        "low_end": _as_dict(analysis_payload.get("low_end")),
        "limiter_stress": _as_dict(analysis_payload.get("limiter_stress")),
        "spectral_rms": _as_dict(analysis_payload.get("spectral_rms")),
        "transients": _as_dict(analysis_payload.get("transients")),
    }


def build_artist_feedback_payload(
    result: AnalysisResult,
    artist_decision_payload: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Build the local artist-facing detailed feedback payload.

    This payload is meant for the future Detailed Feedback / Listening Guidance page.
    It intentionally collects already validated product-facing summaries and technical
    meter data without exporting raw debug blocks such as feature vectors, similarity
    matrices, novelty curves, boundary decisions, macro-section internals, fusion, or
    micro-structure internals.
    """
    decision_payload = _build_decision_payload(result, artist_decision_payload)
    consultant_input = _as_dict(result.consultant_input)
    artist_guidance = _build_artist_guidance(consultant_input)
    section_character_summary = _as_dict(artist_guidance.get("section_character_summary"))
    engine_signals = _build_engine_signals(consultant_input)

    artist_guidance["section_timeline"] = _build_section_timeline(
        section_character_summary,
        engine_signals.get("sections"),
    )
    section_timeline = artist_guidance.get("section_timeline")
    listening_guidance = _build_listening_guidance(consultant_input, section_timeline)
    artist_guidance["structure_overview"] = _build_structure_overview(
        artist_guidance,
        listening_guidance,
    )
    release_summary = _build_release_summary(decision_payload)
    artist_guidance["technical_overview"] = _build_technical_overview(
        release_summary
    )

    return {
        "track": _build_track(result),
        "release": release_summary,
        "artist_guidance": artist_guidance,
        "listening_guidance": listening_guidance,
        "engine_signals": engine_signals,
        "technical_details": _build_technical_details(result),
        "ai_consultant": {
            "summary_status": "not_generated_by_engine",
            "local_summary_filename": AI_CONSULTANT_SUMMARY_FILENAME,
            "note": "The analysis engine does not generate live AI consultant text. Local markdown summaries may be generated separately for testing.",
        },
        "meta": {
            "source": "analysis_engine",
            "schema": ARTIST_FEEDBACK_PAYLOAD_SCHEMA,
            "created_at": None,
            "warnings": [],
        },
    }


def build_artist_feedback_payload_from_analysis_dict(
    analysis_payload: Mapping[str, Any],
    artist_decision_payload: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Build the local artist-facing detailed feedback payload from an existing
    analysis.json dictionary.

    This is used for backfilling existing analysis outputs without re-running
    the audio analysis engine.
    """
    decision_payload = (
        dict(artist_decision_payload)
        if artist_decision_payload is not None
        else build_artist_decision_payload(analysis_payload)
    )
    consultant_input = _as_dict(analysis_payload.get("consultant_input"))
    artist_guidance = _build_artist_guidance(consultant_input)
    section_character_summary = _as_dict(artist_guidance.get("section_character_summary"))
    engine_signals = _build_engine_signals(consultant_input)

    artist_guidance["section_timeline"] = _build_section_timeline(
        section_character_summary,
        engine_signals.get("sections"),
    )
    section_timeline = artist_guidance.get("section_timeline")
    listening_guidance = _build_listening_guidance(consultant_input, section_timeline)
    artist_guidance["structure_overview"] = _build_structure_overview(
        artist_guidance,
        listening_guidance,
    )
    release_summary = _build_release_summary(decision_payload)
    artist_guidance["technical_overview"] = _build_technical_overview(
        release_summary
    )

    return {
        "track": _build_track_from_analysis_dict(analysis_payload),
        "release": release_summary,
        "artist_guidance": artist_guidance,
        "listening_guidance": listening_guidance,
        "engine_signals": engine_signals,
        "technical_details": _build_technical_details_from_analysis_dict(analysis_payload),
        "ai_consultant": {
            "summary_status": "not_generated_by_engine",
            "local_summary_filename": AI_CONSULTANT_SUMMARY_FILENAME,
            "note": "The analysis engine does not generate live AI consultant text. Local markdown summaries may be generated separately for testing.",
        },
        "meta": {
            "source": "analysis_engine",
            "schema": ARTIST_FEEDBACK_PAYLOAD_SCHEMA,
            "created_at": None,
            "warnings": [],
        },
    }
