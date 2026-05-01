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

    return {
        "track": _build_track(result),
        "release": _build_release_summary(decision_payload),
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

    return {
        "track": _build_track_from_analysis_dict(analysis_payload),
        "release": _build_release_summary(decision_payload),
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
