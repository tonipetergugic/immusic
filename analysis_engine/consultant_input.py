from __future__ import annotations

from typing import Any

from analysis_engine.schemas import AnalysisResult


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return []


def build_consultant_input(result: AnalysisResult) -> dict[str, Any]:
    """
    Build the minimal OpenAI-facing input from the stable product payload.

    This intentionally excludes filenames, artifact paths, beat grids, raw
    segments, debug blocks, feature vectors, similarity matrices, novelty data,
    boundary decisions, macro sections, fusion, and micro analysis.
    """
    product_payload = _as_dict(result.product_payload)

    track = _as_dict(product_payload.get("track"))
    structure = _as_dict(product_payload.get("structure"))
    technical_metrics = _as_dict(product_payload.get("technical_metrics"))

    return {
        "track_context": {
            "duration_sec": track.get("duration_sec"),
        },
        "summary": {
            "tempo_estimate": _as_dict(product_payload.get("summary")).get("tempo_estimate"),
        },
        "issues": _as_list(product_payload.get("issues")),
        "structure": {
            "segment_count": structure.get("segment_count"),
            "repetition_score": structure.get("repetition_score"),
            "contrast_score": structure.get("contrast_score"),
            "transition_score": structure.get("transition_score"),
        },
        "score_context": {
            "scale": "0.0 = low, 1.0 = high",
            "repetition_score": "Bar-level arrangement/material reuse. This does not directly measure melodic monotony.",
            "contrast_score": "Structural form contrast based on section shape. This does not directly measure sound, melody, density, or energy contrast.",
            "transition_score": "Transition and change clarity based on accepted structural change points.",
        },
        "technical_metrics": {
            "loudness": _as_dict(technical_metrics.get("loudness")),
            "dynamics": _as_dict(technical_metrics.get("dynamics")),
            "stereo": _as_dict(technical_metrics.get("stereo")),
            "low_end": _as_dict(technical_metrics.get("low_end")),
        },
    }
