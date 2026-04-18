from __future__ import annotations

import json
from pathlib import Path

from analysis_engine.schemas import AnalysisResult


def write_analysis_json(result: AnalysisResult) -> Path:
    json_path = Path(result.artifacts.json_path)
    json_path.parent.mkdir(parents=True, exist_ok=True)

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    return json_path
