from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PLACEHOLDER = "{{consultant_input}}"

LOCAL_ARTIST_CONTEXTS_FILENAME = "local_artist_contexts.json"


def _load_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    return path.read_text(encoding="utf-8")


def _load_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in: {path}")

    return data


def _load_local_artist_context(track_output_name: str) -> dict | None:
    context_path = Path(__file__).resolve().parent / LOCAL_ARTIST_CONTEXTS_FILENAME

    if not context_path.exists():
        return None

    contexts = _load_json(context_path)
    context = contexts.get(track_output_name)

    if context is None:
        return None

    if not isinstance(context, dict):
        raise ValueError(
            f"Invalid local artist context for track output folder: {track_output_name}"
        )

    return context


def _as_text(value: object) -> str:
    if value is None:
        return "not available"
    return str(value)


def _as_yes_no(value: object) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    return "not available"


def _as_number(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
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


def _derive_time_range_from_structure(
    consultant_input: dict[str, Any],
    segment_index: int | None,
) -> tuple[str | None, str | None]:
    if segment_index is None:
        return None, None

    structure_summary = consultant_input.get("structure_summary")
    if not isinstance(structure_summary, dict):
        return None, None

    sections = structure_summary.get("sections")
    if not isinstance(sections, list):
        return None, None

    for section in sections:
        if not isinstance(section, dict):
            continue
        if section.get("index") != segment_index:
            continue
        start_sec = _as_number(section.get("start_sec"))
        end_sec = _as_number(section.get("end_sec"))
        return _format_mmss(start_sec), _format_mmss(end_sec)

    return None, None


def _display_relative_role(value: object) -> str:
    role = _as_text(value)
    role_map = {
        "opening_area": "opening part",
        "reduced_area": "reduced passage",
        "stronger_area": "stronger passage",
        "main_area": "main passage",
        "closing_area": "closing part",
    }
    return role_map.get(role, role.replace("_", " "))


def _build_musical_flow_summary_section(consultant_input: dict) -> str:
    musical_flow_summary = consultant_input.get("musical_flow_summary")
    if not isinstance(musical_flow_summary, dict):
        return (
            "## Musical flow summary\n\n"
            "- Energy movement: not available\n"
            "- Energy direction: not available\n"
            "- Density movement: not available\n"
            "- Density direction: not available\n"
            "- Movement signal: not available\n"
            "- Movement profile: not available\n"
            "- Possible repeated structure focus: not available\n"
            "- Listening check: not available"
        )

    return (
        "## Musical flow summary\n\n"
        f"- Energy movement: {_as_text(musical_flow_summary.get('energy_movement'))}\n"
        f"- Energy direction: {_as_text(musical_flow_summary.get('energy_direction'))}\n"
        f"- Density movement: {_as_text(musical_flow_summary.get('density_movement'))}\n"
        f"- Density direction: {_as_text(musical_flow_summary.get('density_direction'))}\n"
        f"- Movement signal: {_as_text(musical_flow_summary.get('movement_signal'))}\n"
        f"- Movement profile: {_as_text(musical_flow_summary.get('movement_profile'))}\n"
        f"- Possible repeated structure focus: {_as_yes_no(musical_flow_summary.get('possible_repeated_structure_focus'))}\n"
        f"- Listening check: {_as_text(musical_flow_summary.get('listening_check'))}"
    )


def _build_section_character_summary_section(consultant_input: dict[str, Any]) -> str:
    section_character_summary = consultant_input.get("section_character_summary")
    if not isinstance(section_character_summary, dict):
        return ""

    if section_character_summary.get("status") != "available":
        return ""

    overall = section_character_summary.get("overall")
    sections = section_character_summary.get("sections")
    if not isinstance(overall, dict) or not isinstance(sections, list):
        return ""

    lines = [
        "## Section character summary",
        "",
        f"- Overall energy profile: {_as_text(overall.get('energy_profile'))}",
        f"- Overall density profile: {_as_text(overall.get('density_profile'))}",
        "- Section character flow:",
    ]

    for section in sections:
        if not isinstance(section, dict):
            continue
        lines.append(
            "  - "
            f"{_as_text(section.get('position'))} / "
            f"{_as_text(section.get('duration_character'))} / "
            f"{_as_text(section.get('energy_level'))} energy / "
            f"{_as_text(section.get('density_level'))} density / "
            f"{_as_text(section.get('movement'))} / "
            f"{_display_relative_role(section.get('relative_role'))}"
        )

    return "\n".join(lines)


def _build_arrangement_development_summary_section(consultant_input: dict[str, Any]) -> str:
    arrangement_development_summary = consultant_input.get("arrangement_development_summary")
    if not isinstance(arrangement_development_summary, dict):
        return ""

    if arrangement_development_summary.get("status") != "available":
        return ""

    extended_span_evidence = arrangement_development_summary.get(
        "extended_core_arrangement_span_evidence"
    )
    extended_span_evidence_line = ""
    if isinstance(extended_span_evidence, dict):
        segment_index = _as_text(extended_span_evidence.get("segment_index"))
        start_time = extended_span_evidence.get("start_time")
        end_time = extended_span_evidence.get("end_time")
        segment_index_number = extended_span_evidence.get("segment_index")
        segment_index_value = segment_index_number if isinstance(segment_index_number, int) else None
        if not (isinstance(start_time, str) and start_time and isinstance(end_time, str) and end_time):
            start_time, end_time = _derive_time_range_from_structure(
                consultant_input,
                segment_index=segment_index_value,
            )
        duration_sec = _as_text(extended_span_evidence.get("duration_sec"))
        duration_share = _as_text(extended_span_evidence.get("duration_share"))
        if isinstance(start_time, str) and start_time and isinstance(end_time, str) and end_time:
            extended_span_evidence_line = (
                "\n"
                f"- Extended core span evidence: approx. {start_time}–{end_time}, "
                f"segment {segment_index}, duration {duration_sec}s, share {duration_share}\n"
            )
        else:
            extended_span_evidence_line = (
                "\n"
                f"- Extended core span evidence: segment {segment_index}, "
                f"duration {duration_sec}s, share {duration_share}\n"
            )

    return (
        "## Arrangement development summary\n\n"
        f"- Development signal: {_as_text(arrangement_development_summary.get('development_signal'))}\n"
        f"- Variation signal: {_as_text(arrangement_development_summary.get('variation_signal'))}\n"
        f"- Journey shape: {_as_text(arrangement_development_summary.get('journey_shape'))}\n"
        f"- Possible low-contrast arrangement focus: {_as_yes_no(arrangement_development_summary.get('possible_low_contrast_arrangement_focus'))}\n"
        f"- Possible extended core arrangement span: {_as_yes_no(arrangement_development_summary.get('possible_extended_core_arrangement_span'))}\n"
        f"{extended_span_evidence_line}"
        f"- Listening check: {_as_text(arrangement_development_summary.get('listening_check'))}"
    )


def build_consultant_prompt_preview(analysis_json_path: Path) -> Path:
    analysis_json_path = analysis_json_path.expanduser().resolve()
    analysis_data = _load_json(analysis_json_path)

    consultant_input = analysis_data.get("consultant_input")
    if not isinstance(consultant_input, dict):
        raise ValueError("analysis.json does not contain a valid consultant_input object.")

    consultant_input = dict(consultant_input)
    summary = consultant_input.get("summary")
    if isinstance(summary, dict):
        summary.pop("tempo_estimate", None)
        if not summary:
            consultant_input.pop("summary", None)

    musical_flow_summary = consultant_input.get("musical_flow_summary")
    if isinstance(musical_flow_summary, dict):
        musical_flow_summary.pop("wording_note", None)

    section_character_summary = consultant_input.get("section_character_summary")
    if isinstance(section_character_summary, dict):
        section_character_summary.pop("wording_note", None)

    arrangement_development_summary = consultant_input.get("arrangement_development_summary")
    if isinstance(arrangement_development_summary, dict):
        arrangement_development_summary.pop("wording_note", None)
        arrangement_development_summary.pop("evidence", None)

    local_artist_context = _load_local_artist_context(analysis_json_path.parent.name)
    if local_artist_context is not None:
        consultant_input["artist_declared_context"] = local_artist_context

    prompt_template_path = Path(__file__).resolve().parent / "consultant_prompt.md"
    prompt_template = _load_text(prompt_template_path)

    if PLACEHOLDER not in prompt_template:
        raise ValueError(f"Prompt template does not contain placeholder: {PLACEHOLDER}")

    consultant_input_json = json.dumps(
        consultant_input,
        ensure_ascii=False,
        indent=2,
    )

    musical_flow_summary_section = _build_musical_flow_summary_section(consultant_input)
    section_character_summary_section = _build_section_character_summary_section(consultant_input)
    arrangement_development_summary_section = _build_arrangement_development_summary_section(
        consultant_input
    )
    prompt_preview_input_parts = [musical_flow_summary_section]
    if section_character_summary_section:
        prompt_preview_input_parts.append(section_character_summary_section)
    if arrangement_development_summary_section:
        prompt_preview_input_parts.append(arrangement_development_summary_section)
    prompt_preview_input_parts.append(consultant_input_json)
    prompt_preview_input = "\n\n".join(prompt_preview_input_parts)
    prompt_preview = prompt_template.replace(PLACEHOLDER, prompt_preview_input)

    output_path = analysis_json_path.parent / "consultant_prompt_preview.md"
    output_path.write_text(prompt_preview, encoding="utf-8")

    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a local AI consultant prompt preview from an analysis.json file."
    )
    parser.add_argument(
        "analysis_json_path",
        help="Path to analysis_engine/output/<track>/analysis.json",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = build_consultant_prompt_preview(Path(args.analysis_json_path))

    print(f"Consultant prompt preview written to: {output_path}")


if __name__ == "__main__":
    main()
