from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Mapping


ARTIST_FEEDBACK_PAYLOAD_FILENAME = "artist_feedback_payload.json"
OUTPUT_ROOT = Path(__file__).resolve().parent / "output"

EXPECTED_READINESS_STATES = {
    "ready",
    "almost_ready",
    "needs_revision",
    "blocked",
    "incomplete",
}

EXPECTED_TECHNICAL_AREAS = {
    "loudness",
    "peaks",
    "dynamics",
    "stereo",
    "low_end",
    "file",
}

EXPECTED_TECHNICAL_STATES = {
    "ok",
    "warning",
    "problem",
    "unavailable",
}

EXPECTED_STRUCTURE_STATUSES = {
    "available",
    "limited",
    "unavailable",
}

EXPECTED_MIX_STATUSES = {
    "available",
    "unavailable",
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


def _has_value(mapping: Mapping[str, Any], key: str) -> bool:
    if key not in mapping:
        return False

    value = mapping.get(key)
    if value is None:
        return False

    if isinstance(value, str):
        return bool(value.strip())

    if isinstance(value, (list, dict)):
        return bool(value)

    return True


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")

    return payload


def _find_payload_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root]

    return sorted(root.glob(f"*/{ARTIST_FEEDBACK_PAYLOAD_FILENAME}"))


def _format_counter(counter: Counter[str]) -> str:
    if not counter:
        return "none"

    return ", ".join(f"{key}: {count}" for key, count in sorted(counter.items()))


def _print_counter(title: str, counter: Counter[str]) -> None:
    print(f"{title}:")
    if not counter:
        print("- none")
        return

    for key, count in sorted(counter.items()):
        print(f"- {key}: {count}")


def _print_missing(title: str, expected: set[str], actual: Counter[str]) -> None:
    missing = sorted(expected - set(actual.keys()))
    print(f"{title}:")
    if not missing:
        print("- none")
        return

    for item in missing:
        print(f"- {item}")


def _critical_warning_code(warning: Mapping[str, Any]) -> str:
    return (
        _clean_text(warning.get("code"))
        or _clean_text(warning.get("issue_code"))
        or _clean_text(warning.get("title"))
        or "unknown"
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Report non-gating coverage for generated artist feedback payloads."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=str(OUTPUT_ROOT),
        help=(
            "Path to analysis_engine/output, a track output folder, "
            "or one artist_feedback_payload.json file."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    root = Path(args.path).expanduser()

    if root.is_dir() and root.name != "output":
        candidate = root / ARTIST_FEEDBACK_PAYLOAD_FILENAME
        payload_files = [candidate] if candidate.exists() else _find_payload_files(root)
    else:
        payload_files = _find_payload_files(root)

    print("Artist Feedback Payload Coverage Audit")
    print("=====================================")
    print(f"Input: {root}")

    if not payload_files:
        print("Payload files: 0")
        print("No artist_feedback_payload.json files found.")
        return

    readiness_states: Counter[str] = Counter()
    readiness_labels: Counter[str] = Counter()
    track_status_labels: Counter[str] = Counter()
    track_status_states: Counter[str] = Counter()

    technical_by_area: dict[str, Counter[str]] = defaultdict(Counter)
    technical_states_overall: Counter[str] = Counter()

    critical_warning_codes: Counter[str] = Counter()

    structure_statuses: Counter[str] = Counter()
    structure_field_presence: Counter[str] = Counter()

    technical_overview_statuses: Counter[str] = Counter()
    technical_overview_field_presence: Counter[str] = Counter()
    technical_overview_field_missing: Counter[str] = Counter()

    mix_overview_statuses: Counter[str] = Counter()
    mix_overview_field_presence: Counter[str] = Counter()
    mix_overview_field_missing: Counter[str] = Counter()

    listening_guidance_item_counts: list[int] = []
    listening_guidance_source_signals: Counter[str] = Counter()
    listening_guidance_missing_source_signal = 0

    for payload_path in payload_files:
        payload = _load_json(payload_path)

        release = _as_dict(payload.get("release"))
        release_readiness = _as_dict(release.get("release_readiness"))
        track_status = _as_dict(release.get("track_status"))

        state = _clean_text(release_readiness.get("state"))
        if state:
            readiness_states[state] += 1

        label = _clean_text(release_readiness.get("label"))
        if label:
            readiness_labels[label] += 1

        track_status_label = _clean_text(track_status.get("label"))
        if track_status_label:
            track_status_labels[track_status_label] += 1

        track_status_state = _clean_text(track_status.get("state"))
        if track_status_state:
            track_status_states[track_status_state] += 1

        for check in _as_list(release.get("technical_release_checks")):
            check_obj = _as_dict(check)
            area = _clean_text(check_obj.get("area")) or "unknown"
            check_state = _clean_text(check_obj.get("state")) or "unknown"
            technical_by_area[area][check_state] += 1
            technical_states_overall[check_state] += 1

        for warning in _as_list(release.get("critical_warnings")):
            warning_obj = _as_dict(warning)
            critical_warning_codes[_critical_warning_code(warning_obj)] += 1

        artist_guidance = _as_dict(payload.get("artist_guidance"))

        structure_overview = _as_dict(artist_guidance.get("structure_overview"))
        structure_status = _clean_text(structure_overview.get("status"))
        if structure_status:
            structure_statuses[structure_status] += 1

        for field_name in (
            "evidence",
            "timeline_summary",
            "role_journey",
            "key_sections",
            "timeline_hint",
        ):
            if field_name in structure_overview:
                structure_field_presence[field_name] += 1

        technical_overview = _as_dict(artist_guidance.get("technical_overview"))
        technical_overview_status = _clean_text(technical_overview.get("status"))
        if technical_overview_status:
            technical_overview_statuses[technical_overview_status] += 1

        for field_name in (
            "selected_check_id",
            "selected_area",
            "selected_severity",
            "selected_issue_code",
            "selection_reason",
        ):
            if _has_value(technical_overview, field_name):
                technical_overview_field_presence[field_name] += 1
            else:
                technical_overview_field_missing[field_name] += 1

        mix_overview = _as_dict(artist_guidance.get("mix_overview"))
        mix_overview_status = _clean_text(mix_overview.get("status"))
        if mix_overview_status:
            mix_overview_statuses[mix_overview_status] += 1

        for field_name in (
            "selected_guidance_id",
            "source_focus_id",
            "available_signal_groups",
            "evidence",
            "selection_reason",
        ):
            if _has_value(mix_overview, field_name):
                mix_overview_field_presence[field_name] += 1
            else:
                mix_overview_field_missing[field_name] += 1

        listening_guidance = _as_list(payload.get("listening_guidance"))
        listening_guidance_item_counts.append(len(listening_guidance))

        for item in listening_guidance:
            guidance = _as_dict(item)
            evidence = _as_dict(guidance.get("evidence"))
            source_signal = _clean_text(evidence.get("source_signal"))

            if source_signal:
                listening_guidance_source_signals[source_signal] += 1
            else:
                listening_guidance_missing_source_signal += 1

    print(f"Payload files: {len(payload_files)}")
    print()

    _print_counter("release.release_readiness.state", readiness_states)
    print()
    _print_counter("release.release_readiness.label", readiness_labels)
    print()
    _print_counter("release.track_status.label", track_status_labels)
    print()
    _print_counter("release.track_status.state", track_status_states)
    print()

    print("technical_release_checks by area/state:")
    for area in sorted(EXPECTED_TECHNICAL_AREAS | set(technical_by_area.keys())):
        print(f"- {area}: {_format_counter(technical_by_area[area])}")
    print()

    _print_counter("technical_release_checks state overall", technical_states_overall)
    print()
    _print_counter("critical_warnings codes", critical_warning_codes)
    print()

    _print_counter("artist_guidance.structure_overview.status", structure_statuses)
    print()
    _print_counter("structure_overview field presence", structure_field_presence)
    print()

    _print_counter("artist_guidance.technical_overview.status", technical_overview_statuses)
    print()
    _print_counter(
        "technical_overview provenance field presence",
        technical_overview_field_presence,
    )
    print()
    _print_counter(
        "technical_overview provenance field missing",
        technical_overview_field_missing,
    )
    print()

    _print_counter("artist_guidance.mix_overview.status", mix_overview_statuses)
    print()
    _print_counter("mix_overview provenance field presence", mix_overview_field_presence)
    print()
    _print_counter("mix_overview provenance field missing", mix_overview_field_missing)
    print()

    if listening_guidance_item_counts:
        min_items = min(listening_guidance_item_counts)
        max_items = max(listening_guidance_item_counts)
        avg_items = sum(listening_guidance_item_counts) / len(
            listening_guidance_item_counts
        )
        print("listening_guidance items per payload:")
        print(f"- min: {min_items}")
        print(f"- max: {max_items}")
        print(f"- avg: {avg_items:.2f}")
    else:
        print("listening_guidance items per payload:")
        print("- none")
    print()

    _print_counter(
        "listening_guidance evidence.source_signal",
        listening_guidance_source_signals,
    )
    print(
        "listening_guidance missing evidence.source_signal: "
        f"{listening_guidance_missing_source_signal}"
    )
    print()

    print("Missing coverage hints")
    print("----------------------")
    _print_missing(
        "Missing release_readiness.state coverage",
        EXPECTED_READINESS_STATES,
        readiness_states,
    )
    print()
    _print_missing(
        "Missing technical_release_checks state coverage overall",
        EXPECTED_TECHNICAL_STATES,
        technical_states_overall,
    )
    print()
    _print_missing(
        "Missing structure_overview.status coverage",
        EXPECTED_STRUCTURE_STATUSES,
        structure_statuses,
    )
    print()
    _print_missing(
        "Missing mix_overview.status coverage",
        EXPECTED_MIX_STATUSES,
        mix_overview_statuses,
    )
    print()

    print("Note:")
    print("- This script is informational only.")
    print("- Missing coverage is not a contract failure.")
    print("- Contract failures belong in audit_artist_feedback_payload.py.")


if __name__ == "__main__":
    main()
