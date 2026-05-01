from __future__ import annotations

import json
from pathlib import Path

from analysis_engine.artist_decision_payload import build_artist_decision_payload
from analysis_engine.artist_feedback_payload import build_artist_feedback_payload
from analysis_engine.schemas import AnalysisResult


ARTIST_DECISION_PAYLOAD_FILENAME = "artist_decision_payload.json"
ARTIST_FEEDBACK_PAYLOAD_FILENAME = "artist_feedback_payload.json"


def write_analysis_json(result: AnalysisResult) -> Path:
    json_path = Path(result.artifacts.json_path)
    json_path.parent.mkdir(parents=True, exist_ok=True)

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    return json_path


def write_artist_decision_payload_json(result: AnalysisResult) -> Path:
    analysis_payload = result.to_dict()
    output_path = Path(result.artifacts.json_path).with_name(ARTIST_DECISION_PAYLOAD_FILENAME)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    artist_decision_payload = build_artist_decision_payload(analysis_payload)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(artist_decision_payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    return output_path


def write_artist_feedback_payload_json(result: AnalysisResult) -> Path:
    analysis_payload = result.to_dict()
    artist_decision_payload = build_artist_decision_payload(analysis_payload)
    output_path = Path(result.artifacts.json_path).with_name(ARTIST_FEEDBACK_PAYLOAD_FILENAME)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    artist_feedback_payload = build_artist_feedback_payload(
        result,
        artist_decision_payload=artist_decision_payload,
    )

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(artist_feedback_payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    return output_path
