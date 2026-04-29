from __future__ import annotations

from typing import Any

from analysis_engine.arrangement_development_summary import build_arrangement_development_summary
from analysis_engine.schemas import AnalysisResult
from analysis_engine.musical_flow_summary import build_musical_flow_summary
from analysis_engine.section_character_summary import build_section_character_summary


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return []


def _strip_private_consultant_fields(summary: dict[str, Any]) -> dict[str, Any]:
    cleaned = dict(summary)
    cleaned.pop("evidence", None)
    return cleaned


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    return None


def _as_int(value: Any) -> int | None:
    number = _as_number(value)

    if number is None:
        return None

    return int(number)


def _round_number(value: Any, digits: int = 3) -> float | None:
    number = _as_number(value)

    if number is None:
        return None

    return round(number, digits)


def _signal_level(value: Any) -> str:
    number = _as_number(value)

    if number is None:
        return "unavailable"

    if number < 0.4:
        return "low"

    if number < 0.7:
        return "moderate"

    return "high"


def _build_structure_summary(structure: dict[str, Any]) -> dict[str, Any]:
    sections: list[dict[str, Any]] = []

    for position, raw_segment in enumerate(_as_list(structure.get("segments"))):
        segment = _as_dict(raw_segment)

        start_sec = _round_number(segment.get("start_sec"), 2)
        end_sec = _round_number(segment.get("end_sec"), 2)
        start_bar = _as_int(segment.get("start_bar"))
        end_bar = _as_int(segment.get("end_bar"))

        duration_sec = None
        if start_sec is not None and end_sec is not None:
            duration_sec = round(max(0.0, end_sec - start_sec), 2)

        length_bars = None
        if start_bar is not None and end_bar is not None and end_bar >= start_bar:
            length_bars = end_bar - start_bar + 1

        sections.append(
            {
                "index": _as_int(segment.get("index")) or position,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "duration_sec": duration_sec,
                "start_bar": start_bar,
                "end_bar": end_bar,
                "length_bars": length_bars,
            }
        )

    return {
        "section_count": structure.get("segment_count"),
        "sections": sections,
        "readable_signals": {
            "material_reuse": _signal_level(structure.get("repetition_score")),
            "form_contrast": _signal_level(structure.get("contrast_score")),
            "transition_clarity": _signal_level(structure.get("transition_score")),
        },
        "raw_scores": {
            "repetition_score": _round_number(structure.get("repetition_score")),
            "contrast_score": _round_number(structure.get("contrast_score")),
            "transition_score": _round_number(structure.get("transition_score")),
        },
        "labeling_note": "Sections are neutral structural parts. Do not force build, drop, break, verse, or intro labels unless strongly supported elsewhere.",
    }


def _copy_metric(record: dict[str, Any], key: str, digits: int = 3) -> Any:
    if key not in record:
        return None

    number = _as_number(record.get(key))

    if number is None:
        return record.get(key)

    return round(number, digits)


def _pick_metrics(record: dict[str, Any], keys: list[str]) -> dict[str, Any]:
    return {key: _copy_metric(record, key) for key in keys if key in record}


def _build_loudness_summary(loudness: dict[str, Any]) -> dict[str, Any]:
    short_term = _as_dict(loudness.get("short_term_lufs_series"))
    short_term_summary = _as_dict(short_term.get("summary"))

    return {
        "integrated_lufs": _copy_metric(loudness, "integrated_lufs"),
        "loudness_range_lu": _copy_metric(loudness, "loudness_range_lu"),
        "true_peak_dbtp": _copy_metric(loudness, "true_peak_dbtp"),
        "peak_dbfs": _copy_metric(loudness, "peak_dbfs"),
        "clipped_sample_count": _copy_metric(loudness, "clipped_sample_count", digits=0),
        "short_term_lufs_summary": {
            "status": short_term.get("status"),
            "window_sec": _copy_metric(short_term, "window_sec"),
            "hop_sec": _copy_metric(short_term, "hop_sec"),
            "min_lufs_s": _copy_metric(short_term_summary, "min_lufs_s"),
            "max_lufs_s": _copy_metric(short_term_summary, "max_lufs_s"),
            "avg_lufs_s": _copy_metric(short_term_summary, "avg_lufs_s"),
            "p10_lufs_s": _copy_metric(short_term_summary, "p10_lufs_s"),
            "p90_lufs_s": _copy_metric(short_term_summary, "p90_lufs_s"),
            "dynamic_range_lu": _copy_metric(short_term_summary, "dynamic_range_lu"),
        },
    }


def _build_technical_metrics(technical_metrics: dict[str, Any]) -> dict[str, Any]:
    return {
        "loudness": _build_loudness_summary(_as_dict(technical_metrics.get("loudness"))),
        "dynamics": _pick_metrics(
            _as_dict(technical_metrics.get("dynamics")),
            ["crest_factor_db", "integrated_rms_dbfs", "plr_lu", "psr_lu"],
        ),
        "stereo": _pick_metrics(
            _as_dict(technical_metrics.get("stereo")),
            ["side_mid_ratio", "phase_correlation", "stereo_width"],
        ),
        "low_end": _pick_metrics(
            _as_dict(technical_metrics.get("low_end")),
            [
                "mono_loss_low_band_percent",
                "phase_correlation_low_band",
                "low_band_balance_db",
            ],
        ),
    }


def build_consultant_input(result: AnalysisResult) -> dict[str, Any]:
    """
    Build the minimal OpenAI-facing input from the stable product payload.

    This intentionally excludes filenames, artifact paths, beat grids, raw
    segments, debug blocks, feature vectors, similarity matrices, novelty data,
    boundary decisions, macro sections, fusion, and micro analysis.
    The musical flow summary is a compact derived summary, not a debug export.
    section_character_summary provides cautious section-level character hints for the Consultant.
    """
    product_payload = _as_dict(result.product_payload)

    track = _as_dict(product_payload.get("track"))
    structure = _as_dict(product_payload.get("structure"))
    technical_metrics = _as_dict(product_payload.get("technical_metrics"))
    section_character_summary = build_section_character_summary(result)

    return {
        "track_context": {
            "duration_sec": track.get("duration_sec"),
        },
        "summary": {},
        "issues": _as_list(product_payload.get("issues")),
        "structure": {
            "segment_count": structure.get("segment_count"),
            "repetition_score": structure.get("repetition_score"),
            "contrast_score": structure.get("contrast_score"),
            "transition_score": structure.get("transition_score"),
        },
        "structure_summary": _build_structure_summary(structure),
        "section_character_summary": section_character_summary,
        "arrangement_development_summary": _strip_private_consultant_fields(
            build_arrangement_development_summary(result, section_character_summary)
        ),
        "musical_flow_summary": build_musical_flow_summary(result),
        "score_context": {
            "scale": "0.0 = low, 1.0 = high",
            "repetition_score": "Bar-level arrangement/material reuse. This does not directly measure melodic monotony.",
            "contrast_score": "Structural form contrast based on section shape. This does not directly measure sound, melody, density, or energy contrast.",
            "transition_score": "Transition and change clarity based on accepted structural change points.",
        },
        "technical_metrics": _build_technical_metrics(technical_metrics),
    }
