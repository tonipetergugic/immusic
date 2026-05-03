from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping

from analysis_engine.artist_feedback_payload import (
    build_artist_feedback_payload_from_analysis_dict,
)

OUTPUT_ROOT = Path(__file__).resolve().parent / "output"

STRUCTURE_GUIDANCE_AREAS = {"arrangement", "musical_flow"}
SECTION_TIMELINE_GUIDANCE_IDS = {
    "section_timeline_extended_reduced_middle_check",
    "section_timeline_extended_closing_check",
    "section_timeline_contrast_transition_check",
}


def _as_dict(value: Any) -> dict[str, Any]:
    return dict(value) if isinstance(value, Mapping) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def _is_available_text(value: Any) -> bool:
    text = _clean_text(value)
    return text is not None and text != "unavailable"


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")

    return payload


def _find_analysis_json_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root]

    return sorted(root.glob("*/analysis.json"))


def _has_structure_guidance_evidence(payload: Mapping[str, Any]) -> bool:
    for item in _as_list(payload.get("listening_guidance")):
        guidance = _as_dict(item)

        if guidance.get("area") in STRUCTURE_GUIDANCE_AREAS:
            return True

        if guidance.get("id") in SECTION_TIMELINE_GUIDANCE_IDS:
            return True

    return False


def _has_movement_summary_evidence(artist_guidance: Mapping[str, Any]) -> bool:
    summary = _as_dict(artist_guidance.get("musical_flow_summary"))
    if summary.get("status") != "available":
        return False

    for field_name in (
        "movement_profile",
        "movement_signal",
        "energy_movement",
        "energy_direction",
        "density_movement",
        "density_direction",
    ):
        if _is_available_text(summary.get(field_name)):
            return True

    return False


def _has_arrangement_summary_evidence(artist_guidance: Mapping[str, Any]) -> bool:
    summary = _as_dict(artist_guidance.get("arrangement_development_summary"))
    if summary.get("status") != "available":
        return False

    return _is_available_text(summary.get("journey_shape"))


def _has_section_summary_evidence(artist_guidance: Mapping[str, Any]) -> bool:
    summary = _as_dict(artist_guidance.get("section_character_summary"))
    if summary.get("status") != "available":
        return False

    return bool(_as_dict(summary.get("overall")) or _as_list(summary.get("sections")))


def _has_structure_overview_evidence(payload: Mapping[str, Any]) -> bool:
    artist_guidance = _as_dict(payload.get("artist_guidance"))

    return any(
        (
            _has_structure_guidance_evidence(payload),
            _has_movement_summary_evidence(artist_guidance),
            _has_arrangement_summary_evidence(artist_guidance),
            _has_section_summary_evidence(artist_guidance),
        )
    )


def _check_structure_overview(payload: Mapping[str, Any], errors: list[str]) -> None:
    artist_guidance = _as_dict(payload.get("artist_guidance"))
    overview = _as_dict(artist_guidance.get("structure_overview"))
    status = overview.get("status")

    if status == "available" and not _has_structure_overview_evidence(payload):
        errors.append("structure_overview.status is available without structure evidence")

    section_timeline = _as_list(artist_guidance.get("section_timeline"))
    if status == "unavailable" and section_timeline:
        errors.append("structure_overview.status is unavailable although section_timeline exists")


def _check_technical_guidance(payload: Mapping[str, Any], errors: list[str]) -> None:
    artist_guidance = _as_dict(payload.get("artist_guidance"))
    overview = _as_dict(artist_guidance.get("technical_overview"))

    for item in _as_list(payload.get("listening_guidance")):
        guidance = _as_dict(item)
        if guidance.get("id") != "technical_release_listening_check":
            continue

        if overview.get("status") not in {"problem", "warning", "ok"}:
            errors.append("technical_release_listening_check without usable technical_overview.status")

        if _clean_text(overview.get("headline")) is None:
            errors.append("technical_release_listening_check without technical_overview.headline")

        if _clean_text(overview.get("listening_focus")) is None:
            errors.append("technical_release_listening_check without technical_overview.listening_focus")

        evidence = _as_dict(guidance.get("evidence"))
        if evidence.get("source_signal") != "artist_guidance.technical_overview":
            errors.append("technical_release_listening_check has wrong evidence.source_signal")


def _check_mix_guidance(payload: Mapping[str, Any], errors: list[str]) -> None:
    artist_guidance = _as_dict(payload.get("artist_guidance"))
    overview = _as_dict(artist_guidance.get("mix_overview"))

    if (
        overview.get("source_focus_id") == "limiter_headroom_stress_check"
        and "limiter_stress" not in _as_list(overview.get("available_signal_groups"))
    ):
        errors.append("limiter_headroom_stress_check without limiter_stress available_signal_group")

    for item in _as_list(payload.get("listening_guidance")):
        guidance = _as_dict(item)
        if guidance.get("id") != "mix_translation_listening_check":
            continue

        if overview.get("status") != "available":
            errors.append("mix_translation_listening_check without available mix_overview")

        if _clean_text(overview.get("headline")) is None:
            errors.append("mix_translation_listening_check without mix_overview.headline")

        if _clean_text(overview.get("listening_focus")) is None:
            errors.append("mix_translation_listening_check without mix_overview.listening_focus")

        evidence = _as_dict(guidance.get("evidence"))
        if evidence.get("source_signal") != "artist_guidance.mix_overview":
            errors.append("mix_translation_listening_check has wrong evidence.source_signal")


def _has_section_evidence_fields(evidence: Mapping[str, Any]) -> bool:
    return (
        evidence.get("section_index") is not None
        and isinstance(evidence.get("time_range"), Mapping)
        and evidence.get("duration_sec") is not None
    )


def _check_payload_structure_contract(payload: Mapping[str, Any], errors: list[str]) -> None:
    """Validate root paths, required blocks, and status-shaped fields on built payloads."""

    root_lg = payload.get("listening_guidance")
    if not isinstance(root_lg, list):
        errors.append("payload.listening_guidance must exist and be a list")

    artist_guidance = payload.get("artist_guidance")
    if not isinstance(artist_guidance, Mapping):
        errors.append("payload.artist_guidance must be a mapping")
        artist_guidance = {}

    if isinstance(artist_guidance, Mapping) and "listening_guidance" in artist_guidance:
        errors.append("payload.artist_guidance.listening_guidance must not exist (use root listening_guidance)")

    for key in (
        "structure_overview",
        "technical_overview",
        "mix_overview",
        "section_timeline",
    ):
        if key not in artist_guidance:
            errors.append(f"artist_guidance missing required block: {key}")

    release = payload.get("release")
    if not isinstance(release, Mapping):
        errors.append("payload.release must be a mapping")
    else:
        for key in (
            "track_status",
            "release_readiness",
            "critical_warnings",
            "technical_release_checks",
            "next_step",
        ):
            if key not in release:
                errors.append(f"release missing required block: {key}")

    structure = artist_guidance.get("structure_overview")
    if not isinstance(structure, Mapping):
        errors.append("structure_overview must be a dict")
    else:
        if "status" not in structure:
            errors.append("structure_overview missing status")

        if structure.get("status") == "unavailable":
            if (
                structure.get("timeline_summary")
                or structure.get("role_journey")
                or structure.get("key_sections")
            ):
                errors.append(
                    "structure_overview.status unavailable must not set timeline_summary, role_journey, or key_sections"
                )

        if structure.get("status") in {"available", "limited"}:
            for field_name in (
                "headline",
                "main_observation",
                "listening_focus",
                "confidence",
                "evidence",
            ):
                if not structure.get(field_name):
                    errors.append(
                        f"structure_overview.status {structure.get('status')} missing required field: {field_name}"
                    )

    timeline = artist_guidance.get("section_timeline")
    if not isinstance(timeline, list):
        errors.append("section_timeline must be a list")
    else:
        for index, item in enumerate(timeline):
            if not isinstance(item, Mapping):
                errors.append(f"section_timeline item {index} must be a dict")
                continue
            if _clean_text(item.get("role_hint")) is None:
                errors.append(f"section_timeline item {index} missing role_hint")

    technical = artist_guidance.get("technical_overview")
    if not isinstance(technical, Mapping):
        errors.append("technical_overview must be a dict")
    else:
        if "status" not in technical:
            errors.append("technical_overview missing status")

        if technical.get("status") in {"warning", "problem"}:
            for field_name in (
                "selected_check_id",
                "selected_area",
                "selected_severity",
                "selection_reason",
            ):
                if not technical.get(field_name):
                    errors.append(
                        f"technical_overview.status {technical.get('status')} missing required field: {field_name}"
                    )

    mix = artist_guidance.get("mix_overview")
    if not isinstance(mix, Mapping):
        errors.append("mix_overview must be a dict")
    else:
        if "status" not in mix:
            errors.append("mix_overview missing status")

        if mix.get("status") == "available":
            if not mix.get("selection_reason"):
                errors.append("mix_overview.status available missing selection_reason")
            if "available_signal_groups" not in mix:
                errors.append("mix_overview.status available missing available_signal_groups")

        if mix.get("source_focus_id") and not mix.get("evidence"):
            errors.append("mix_overview.source_focus_id set without evidence")


def _check_section_timeline_guidance(payload: Mapping[str, Any], errors: list[str]) -> None:
    artist_guidance = _as_dict(payload.get("artist_guidance"))
    section_timeline = _as_list(artist_guidance.get("section_timeline"))

    for item in _as_list(payload.get("listening_guidance")):
        guidance = _as_dict(item)
        guidance_id = guidance.get("id")

        if guidance_id not in SECTION_TIMELINE_GUIDANCE_IDS:
            continue

        if not section_timeline:
            errors.append(f"{guidance_id} exists without section_timeline")

        evidence = _as_dict(guidance.get("evidence"))
        if evidence.get("source_signal") != "artist_guidance.section_timeline":
            errors.append(f"{guidance_id} has wrong evidence.source_signal")

        if guidance_id == "section_timeline_contrast_transition_check":
            from_section = _as_dict(evidence.get("from_section"))
            to_section = _as_dict(evidence.get("to_section"))

            if not _has_section_evidence_fields(from_section):
                errors.append(f"{guidance_id} has incomplete from_section evidence")

            if not _has_section_evidence_fields(to_section):
                errors.append(f"{guidance_id} has incomplete to_section evidence")

        elif not _has_section_evidence_fields(evidence):
            errors.append(f"{guidance_id} has incomplete section evidence")


def _check_listening_guidance_contract(payload: Mapping[str, Any], errors: list[str]) -> None:
    """Validate root-level listening_guidance item shape and evidence provenance."""

    root_lg = payload.get("listening_guidance")
    if not isinstance(root_lg, list):
        errors.append("listening_guidance must be a list on payload root")
        return

    for index, item in enumerate(root_lg):
        if not isinstance(item, dict):
            errors.append(f"listening_guidance[{index}] must be a dict")
            continue

        if _clean_text(item.get("id")) is None:
            errors.append(f"listening_guidance[{index}] missing non-empty string id")

        if _clean_text(item.get("area")) is None:
            errors.append(f"listening_guidance[{index}] missing non-empty string area")

        evidence = item.get("evidence")
        if not isinstance(evidence, dict):
            errors.append(f"listening_guidance[{index}] evidence must be a dict")
            continue

        if _clean_text(evidence.get("source_signal")) is None:
            errors.append(
                f"listening_guidance[{index}] evidence.source_signal must be a non-empty string"
            )


def _audit_payload(payload: Mapping[str, Any]) -> list[str]:
    errors: list[str] = []

    _check_payload_structure_contract(payload, errors)
    _check_listening_guidance_contract(payload, errors)
    _check_structure_overview(payload, errors)
    _check_technical_guidance(payload, errors)
    _check_mix_guidance(payload, errors)
    _check_section_timeline_guidance(payload, errors)

    return errors


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit generated artist feedback payloads without writing files."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=str(OUTPUT_ROOT),
        help="Path to analysis_engine/output or one analysis.json file.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    analysis_json_files = _find_analysis_json_files(Path(args.path).expanduser())
    if not analysis_json_files:
        raise SystemExit(f"No analysis.json files found: {args.path}")

    failed = False

    for analysis_json_path in analysis_json_files:
        analysis_payload = _load_json(analysis_json_path)
        payload = build_artist_feedback_payload_from_analysis_dict(analysis_payload)
        errors = _audit_payload(payload)

        if errors:
            failed = True
            print(f"FAIL {analysis_json_path.parent.name}")
            for error in errors:
                print(f"- {error}")
        else:
            print(f"OK {analysis_json_path.parent.name}")

    if failed:
        raise SystemExit(1)

    print(f"Audit passed for {len(analysis_json_files)} artist feedback payload(s).")


if __name__ == "__main__":
    main()
