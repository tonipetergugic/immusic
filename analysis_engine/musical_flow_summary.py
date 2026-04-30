from __future__ import annotations

from typing import Any

from analysis_engine.schemas import AnalysisResult


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    return None


def _energy_movement_from_loudness(dynamic_range_lu: float | None) -> str:
    if dynamic_range_lu is None:
        return "unavailable"

    if dynamic_range_lu < 4.0:
        return "stable"

    if dynamic_range_lu < 8.0:
        return "moderate"

    return "strong"


def _density_movement_from_transients(transient_density_cv: float | None) -> str:
    if transient_density_cv is None:
        return "unavailable"

    if transient_density_cv < 0.18:
        return "stable"

    if transient_density_cv < 0.35:
        return "moderate"

    return "varied"


def _movement_signal(
    *,
    energy_movement: str,
    density_movement: str,
    repetition_score: float | None,
    contrast_score: float | None,
    transition_score: float | None,
) -> str:
    source_count = 0
    points = 0

    if energy_movement != "unavailable":
        source_count += 1
        points += {"stable": 0, "moderate": 1, "strong": 2}.get(energy_movement, 0)

    if density_movement != "unavailable":
        source_count += 1
        points += {"stable": 0, "moderate": 1, "varied": 2}.get(density_movement, 0)

    if contrast_score is not None:
        source_count += 1
        if contrast_score >= 0.55:
            points += 2
        elif contrast_score >= 0.35:
            points += 1

    if transition_score is not None:
        source_count += 1
        if transition_score >= 0.7:
            points += 1

    if repetition_score is not None:
        source_count += 1
        if repetition_score >= 0.7 and (contrast_score is None or contrast_score < 0.45):
            points -= 1

    if source_count == 0:
        return "unavailable"

    if points <= 1:
        return "limited"

    if points <= 4:
        return "moderate"

    return "noticeable"


def _possible_repeated_structure_focus(
    *,
    energy_movement: str,
    density_movement: str,
    repetition_score: float | None,
    contrast_score: float | None,
) -> bool:
    if repetition_score is None:
        return False

    if repetition_score >= 0.7 and (contrast_score is None or contrast_score < 0.45):
        return True

    if (
        repetition_score >= 0.6
        and contrast_score is not None
        and contrast_score < 0.35
        and energy_movement == "stable"
        and density_movement in {"stable", "unavailable"}
    ):
        return True

    return False


def _listening_check(
    *,
    movement_signal: str,
    possible_repeated_structure_focus: bool,
) -> str:
    if possible_repeated_structure_focus:
        return (
            "Check whether the energy and density flow keeps enough forward motion "
            "while the central idea stays in focus."
        )

    if movement_signal == "limited":
        return (
            "Check whether the energy and density flow creates enough forward motion "
            "between the larger track areas."
        )

    if movement_signal == "moderate":
        return (
            "Check whether the energy and density changes feel intentional and help "
            "the track keep moving over time."
        )

    if movement_signal == "noticeable":
        return (
            "Use a normal reference listening pass to confirm that the energy and "
            "density movement feels natural for the declared genre."
        )

    return "Musical flow evidence is currently limited; rely on a normal listening pass."


def build_musical_flow_summary(result: AnalysisResult) -> dict[str, Any]:
    """
    Build a compact Consultant-facing movement summary.

    This is intentionally a derived summary, not a debug export. It must not expose
    raw timelines, bar vectors, similarity matrices, novelty data, or boundary data.
    """
    product_payload = _as_dict(result.product_payload)
    structure = _as_dict(product_payload.get("structure"))

    repetition_score = _as_number(structure.get("repetition_score"))
    contrast_score = _as_number(structure.get("contrast_score"))
    transition_score = _as_number(structure.get("transition_score"))

    short_term_summary = result.loudness.short_term_lufs_series.summary
    dynamic_range_lu = _as_number(short_term_summary.dynamic_range_lu)

    transient_density_cv = _as_number(result.transients.transient_density_cv)

    energy_movement = _energy_movement_from_loudness(dynamic_range_lu)
    density_movement = _density_movement_from_transients(transient_density_cv)
    movement_signal = _movement_signal(
        energy_movement=energy_movement,
        density_movement=density_movement,
        repetition_score=repetition_score,
        contrast_score=contrast_score,
        transition_score=transition_score,
    )
    repeated_structure_focus = _possible_repeated_structure_focus(
        energy_movement=energy_movement,
        density_movement=density_movement,
        repetition_score=repetition_score,
        contrast_score=contrast_score,
    )

    status = "available"
    if movement_signal == "unavailable":
        status = "not_available"

    return {
        "status": status,
        "energy_movement": energy_movement,
        "density_movement": density_movement,
        "movement_signal": movement_signal,
        "possible_repeated_structure_focus": repeated_structure_focus,
        "listening_check": _listening_check(
            movement_signal=movement_signal,
            possible_repeated_structure_focus=repeated_structure_focus,
        ),
        "wording_note": (
            "Use this as cautious musical-flow evidence only. Do not describe it as "
            "drop, build, break, verse, melody, or sample detection."
        ),
    }
