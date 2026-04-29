from __future__ import annotations

import argparse
import json
from pathlib import Path


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

    prompt_preview = prompt_template.replace(PLACEHOLDER, consultant_input_json)

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
