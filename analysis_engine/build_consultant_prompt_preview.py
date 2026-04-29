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
            "- Density movement: not available\n"
            "- Development signal: not available\n"
            "- Possible repeated focus: not available\n"
            "- Listening check: not available"
        )

    return (
        "## Musical flow summary\n\n"
        f"- Energy movement: {_as_text(musical_flow_summary.get('energy_movement'))}\n"
        f"- Density movement: {_as_text(musical_flow_summary.get('density_movement'))}\n"
        f"- Development signal: {_as_text(musical_flow_summary.get('development_signal'))}\n"
        f"- Possible repeated focus: {_as_yes_no(musical_flow_summary.get('possible_repeated_focus'))}\n"
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
    prompt_preview_input_parts = [musical_flow_summary_section]
    if section_character_summary_section:
        prompt_preview_input_parts.append(section_character_summary_section)
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
