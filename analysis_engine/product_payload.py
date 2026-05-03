from __future__ import annotations

from dataclasses import asdict
from typing import Any

from analysis_engine.schemas import AnalysisResult


def build_product_payload(result: AnalysisResult) -> dict[str, Any]:
    """
    Build the stable product-facing payload for UI, consultant wording, and artist feedback.

    This payload intentionally excludes engine debug blocks such as features,
    similarity, novelty, boundary_decision, sections, macro_sections, fusion,
    micro, and artifact paths.
    """
    return {
        "track": {
            "filename": result.file_info.filename,
            "duration_sec": result.file_info.duration_sec,
            "sample_rate": result.file_info.sample_rate,
            "channels": result.file_info.channels,
        },
        "summary": asdict(result.summary),
        "issues": result.issues,
        "structure": asdict(result.structure),
        "technical_metrics": {
            "loudness": asdict(result.loudness),
            "dynamics": asdict(result.dynamics),
            "stereo": asdict(result.stereo),
            "low_end": asdict(result.low_end),
            "limiter_stress": asdict(result.limiter_stress),
            "spectral_rms": asdict(result.spectral_rms),
            "transients": asdict(result.transients),
            "mix_basis": asdict(result.mix_basis),
        },
    }
