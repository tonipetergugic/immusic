from __future__ import annotations

from typing import Any

from analysis_engine.schemas import AnalysisResult


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    return None


def _round_number(value: float | None, digits: int = 3) -> float | None:
    if value is None:
        return None

    return round(value, digits)


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


def _movement_signal(energy_movement: str, density_movement: str) -> str:
    if energy_movement == "unavailable" and density_movement == "unavailable":
        return "unavailable"

    if energy_movement == "strong" or density_movement == "varied":
        return "noticeable"

    if energy_movement == "moderate" or density_movement == "moderate":
        return "moderate"

    return "limited"


def _average(values: list[float]) -> float | None:
    if not values:
        return None

    return sum(values) / len(values)


def _early_late_delta(values: list[float]) -> tuple[float | None, float | None, float | None]:
    if len(values) < 6:
        return None, None, None

    bucket_size = max(1, len(values) // 3)
    early_average = _average(values[:bucket_size])
    late_average = _average(values[-bucket_size:])

    if early_average is None or late_average is None:
        return None, None, None

    return early_average, late_average, late_average - early_average


def _energy_values(result: AnalysisResult) -> list[float]:
    values: list[float] = []

    for point in result.loudness.short_term_lufs_series.points:
        value = _as_number(getattr(point, "lufs_s", None))
        if value is not None:
            values.append(value)

    return values


def _density_values(result: AnalysisResult) -> list[float]:
    values: list[float] = []

    for item in result.transients.timeline:
        value = _as_number(getattr(item, "density_per_sec", None))
        if value is not None:
            values.append(value)

    return values


def _energy_direction(values: list[float]) -> tuple[str, dict[str, float | None]]:
    early_average, late_average, delta = _early_late_delta(values)

    if delta is None:
        return "unavailable", {
            "early_avg_lufs_s": _round_number(early_average),
            "late_avg_lufs_s": _round_number(late_average),
            "delta_lu": None,
        }

    if delta >= 1.5:
        direction = "rising"
    elif delta <= -1.5:
        direction = "falling"
    else:
        direction = "stable"

    return direction, {
        "early_avg_lufs_s": _round_number(early_average),
        "late_avg_lufs_s": _round_number(late_average),
        "delta_lu": _round_number(delta),
    }


def _density_direction(values: list[float]) -> tuple[str, dict[str, float | None]]:
    early_average, late_average, delta = _early_late_delta(values)

    if delta is None:
        return "unavailable", {
            "early_avg_density_per_sec": _round_number(early_average),
            "late_avg_density_per_sec": _round_number(late_average),
            "delta_density_per_sec": None,
        }

    overall_average = _average(values) or 0.0
    threshold = max(0.25, abs(overall_average) * 0.2)

    if delta >= threshold:
        direction = "rising"
    elif delta <= -threshold:
        direction = "falling"
    else:
        direction = "stable"

    return direction, {
        "early_avg_density_per_sec": _round_number(early_average),
        "late_avg_density_per_sec": _round_number(late_average),
        "delta_density_per_sec": _round_number(delta),
    }


def _movement_profile(
    energy_direction: str,
    density_direction: str,
    energy_movement: str,
    density_movement: str,
) -> str:
    if energy_direction == "unavailable" and density_direction == "unavailable":
        return "unavailable"

    if energy_direction == "rising" and density_direction == "rising":
        return "combined_lift"

    if energy_direction == "rising" and density_direction in {"stable", "falling", "unavailable"}:
        return "energy_lift_with_limited_density_lift"

    if density_direction == "rising" and energy_direction in {"stable", "falling", "unavailable"}:
        return "density_lift_with_limited_energy_lift"

    if energy_direction == "falling" and density_direction == "falling":
        return "shared_release"

    if energy_direction == "stable" and density_direction == "stable":
        if energy_movement == "stable" and density_movement == "stable":
            return "mostly_stable"
        return "variable_without_clear_lift"

    return "mixed_motion"


def _possible_repeated_structure_focus(
    repetition_score: float | None,
    contrast_score: float | None,
    transition_score: float | None,
    movement_signal: str,
    energy_movement: str,
    density_movement: str,
) -> bool:
    if repetition_score is None:
        return False

    # Keep this deliberately conservative. Repetition alone is not enough;
    # otherwise normal professional thematic return can become a false concern.
    if movement_signal != "limited":
        return False

    if energy_movement != "stable" or density_movement != "stable":
        return False

    if repetition_score >= 0.78 and (contrast_score or 0.0) < 0.35:
        return True

    if repetition_score >= 0.7 and (contrast_score or 0.0) < 0.3 and (transition_score or 0.0) < 0.55:
        return True

    return False


def _listening_check(
    possible_repeated_structure_focus: bool,
    movement_signal: str,
    movement_profile: str,
) -> str:
    if possible_repeated_structure_focus:
        return "Check whether the central musical idea gets enough variation, tension, or a clear lift over time."

    if movement_profile == "energy_lift_with_limited_density_lift":
        return "Check whether the energy lift is also supported by enough arrangement, density, or tension development for the declared genre."

    if movement_profile == "density_lift_with_limited_energy_lift":
        return "Check whether the added density also creates a clear enough lift or forward feeling for the declared genre."

    if movement_profile == "variable_without_clear_lift":
        return "Check whether the movement feels like real development, not only small local changes."

    if movement_profile == "mostly_stable":
        return "Check whether the track still creates enough forward motion across the main sections."

    if movement_signal == "noticeable":
        return "Use a normal reference listening pass to confirm that the energy and density movement feels natural for the declared genre."

    if movement_signal == "moderate":
        return "Check whether the energy and density changes feel intentional and help the track keep moving over time."

    return "Check whether the track creates enough movement over time for the declared genre."


def build_musical_flow_summary(result: AnalysisResult) -> dict[str, Any]:
    """
    Build a compact, cautious musical-flow summary for the AI Consultant.

    This uses stable high-level engine outputs only. It must not claim melody,
    loop, sample, or songwriting repetition. It is only allowed to create
    arrangement-level listening checks around energy and density movement.
    """
    short_term_summary = result.loudness.short_term_lufs_series.summary
    energy_range_lu = _as_number(short_term_summary.dynamic_range_lu)
    density_cv = _as_number(result.transients.transient_density_cv)

    structure = result.product_payload.get("structure") if isinstance(result.product_payload, dict) else {}
    if not isinstance(structure, dict):
        structure = {}

    repetition_score = _as_number(structure.get("repetition_score"))
    contrast_score = _as_number(structure.get("contrast_score"))
    transition_score = _as_number(structure.get("transition_score"))

    energy_movement = _energy_movement_from_loudness(energy_range_lu)
    density_movement = _density_movement_from_transients(density_cv)
    movement_signal = _movement_signal(energy_movement, density_movement)

    energy_values = _energy_values(result)
    density_values = _density_values(result)
    energy_direction, energy_direction_evidence = _energy_direction(energy_values)
    density_direction, density_direction_evidence = _density_direction(density_values)
    movement_profile = _movement_profile(
        energy_direction=energy_direction,
        density_direction=density_direction,
        energy_movement=energy_movement,
        density_movement=density_movement,
    )

    possible_repeated_structure_focus = _possible_repeated_structure_focus(
        repetition_score=repetition_score,
        contrast_score=contrast_score,
        transition_score=transition_score,
        movement_signal=movement_signal,
        energy_movement=energy_movement,
        density_movement=density_movement,
    )

    return {
        "status": "available",
        "energy_movement": energy_movement,
        "energy_direction": energy_direction,
        "density_movement": density_movement,
        "density_direction": density_direction,
        "movement_signal": movement_signal,
        "movement_profile": movement_profile,
        "possible_repeated_structure_focus": possible_repeated_structure_focus,
        "listening_check": _listening_check(
            possible_repeated_structure_focus=possible_repeated_structure_focus,
            movement_signal=movement_signal,
            movement_profile=movement_profile,
        ),
        "evidence_summary": {
            "energy_range_lu": _round_number(energy_range_lu),
            "density_cv": _round_number(density_cv),
            "energy_point_count": len(energy_values),
            "density_point_count": len(density_values),
            "energy_direction": energy_direction_evidence,
            "density_direction": density_direction_evidence,
        },
        "wording_note": "Use as cautious arrangement-flow evidence only. Do not diagnose melody, loop, sample, or songwriting repetition from this summary.",
    }
