from __future__ import annotations

from typing import Any

from analysis_engine.section_character_summary import build_section_character_summary


def build_arrangement_development_summary(
    result: Any,
    section_character_summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not isinstance(section_character_summary, dict):
        section_character_summary = build_section_character_summary(result)

    if not isinstance(section_character_summary, dict):
        return {
            "status": "unavailable",
            "reason": "No section character summary available.",
        }

    if section_character_summary.get("status") != "available":
        return {
            "status": "unavailable",
            "reason": "No section character summary available.",
        }

    sections = section_character_summary.get("sections")
    if not isinstance(sections, list) or not sections:
        return {
            "status": "unavailable",
            "reason": "No section character summary available.",
        }

    overall = section_character_summary.get("overall")
    if isinstance(overall, dict):
        overall_energy_profile = _as_text(overall.get("energy_profile"))
        overall_density_profile = _as_text(overall.get("density_profile"))
    else:
        overall_energy_profile = "unknown"
        overall_density_profile = "unknown"

    energy_values = [_as_text(section.get("energy_level")) for section in sections if isinstance(section, dict)]
    density_values = [_as_text(section.get("density_level")) for section in sections if isinstance(section, dict)]
    movement_values = [_as_text(section.get("movement")) for section in sections if isinstance(section, dict)]
    role_values = [_as_text(section.get("relative_role")) for section in sections if isinstance(section, dict)]

    core_roles = [role for role in role_values if role not in {"opening_area", "closing_area"}]

    energy_variety = _variety_signal(set(energy_values) - {"unknown"})
    density_variety = _variety_signal(set(density_values) - {"unknown"})
    movement_variety = _variety_signal(set(movement_values) - {"unknown"})
    role_variety = _variety_signal(set(core_roles) - {"unknown"})

    variation_signal = _combine_variety(
        energy_variety=energy_variety,
        density_variety=density_variety,
        role_variety=role_variety,
        movement_variety=movement_variety,
        overall_energy_profile=overall_energy_profile,
        overall_density_profile=overall_density_profile,
    )

    structure = getattr(result, "structure", None)
    repetition_score = _as_number(getattr(structure, "repetition_score", None))
    contrast_score = _as_number(getattr(structure, "contrast_score", None))
    transition_score = _as_number(getattr(structure, "transition_score", None))

    development_signal = _development_signal(
        variation_signal=variation_signal,
        movement_values=movement_values,
        transition_score=transition_score,
        contrast_score=contrast_score,
    )
    journey_shape = _journey_shape(movement_values)
    possible_static_focus = _possible_static_focus(
        variation_signal=variation_signal,
        repetition_score=repetition_score,
        contrast_score=contrast_score,
    )

    return {
        "status": "available",
        "development_signal": development_signal,
        "variation_signal": variation_signal,
        "journey_shape": journey_shape,
        "possible_static_focus": possible_static_focus,
        "listening_check": _listening_check(
            development_signal=development_signal,
            possible_static_focus=possible_static_focus,
        ),
        "evidence": {
            "energy_variety": energy_variety,
            "density_variety": density_variety,
            "role_variety": role_variety,
            "movement_variety": movement_variety,
        },
        "wording_note": (
            "Use this only as cautious arrangement-development evidence. Do not treat it "
            "as proof of weak songwriting, repetitive melody, loop repetition, sample "
            "reuse, or missing drops/builds."
        ),
    }


def _as_text(value: Any) -> str:
    if isinstance(value, str) and value.strip():
        return value
    return "unknown"


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _variety_signal(values: set[str]) -> str:
    count = len(values)
    if count <= 1:
        return "low"
    if count == 2:
        return "moderate"
    return "varied"


def _combine_variety(
    *,
    energy_variety: str,
    density_variety: str,
    role_variety: str,
    movement_variety: str,
    overall_energy_profile: str,
    overall_density_profile: str,
) -> str:
    score = (
        _variety_points(energy_variety)
        + _variety_points(density_variety)
        + _variety_points(role_variety)
        + _variety_points(movement_variety)
    )

    if overall_energy_profile in {"varied", "moderate_movement"}:
        score += 1
    if overall_density_profile in {"varied", "moderate_movement"}:
        score += 1

    if score <= 3:
        return "low"
    if score <= 6:
        return "moderate"
    return "varied"


def _variety_points(signal: str) -> int:
    return {"low": 0, "moderate": 1, "varied": 2}.get(signal, 0)


def _development_signal(
    *,
    variation_signal: str,
    movement_values: list[str],
    transition_score: float | None,
    contrast_score: float | None,
) -> str:
    points = {"low": 0, "moderate": 1, "varied": 2}.get(variation_signal, 0)

    movement_set = set(movement_values) - {"unknown"}
    if "changing" in movement_set:
        points += 1
    if "rising" in movement_set and "falling" in movement_set:
        points += 1

    if transition_score is not None and transition_score >= 0.7:
        points += 1
    if contrast_score is not None and contrast_score >= 0.45:
        points += 1

    if points <= 1:
        return "limited"
    if points <= 4:
        return "moderate"
    return "noticeable"


def _journey_shape(movement_values: list[str]) -> str:
    movement_set = set(movement_values) - {"unknown"}
    if not movement_set or movement_set == {"stable"}:
        return "mostly_stable"
    if "rising" in movement_set and "falling" in movement_set:
        if "stable" in movement_set or "changing" in movement_set:
            return "alternating"
        return "changing"
    if movement_set <= {"rising", "stable"}:
        return "building"
    if movement_set <= {"falling", "stable"}:
        return "reducing"
    return "changing"


def _possible_static_focus(
    *,
    variation_signal: str,
    repetition_score: float | None,
    contrast_score: float | None,
) -> bool:
    if variation_signal not in {"low", "moderate"}:
        return False

    if repetition_score is not None and repetition_score >= 0.7:
        return True

    if contrast_score is not None and contrast_score < 0.35:
        return True

    return False


def _listening_check(*, development_signal: str, possible_static_focus: bool) -> str:
    if possible_static_focus:
        return (
            "Check whether the track develops enough new tension, variation, or a "
            "memorable lift across the larger arrangement areas."
        )

    if development_signal == "noticeable":
        return (
            "The larger arrangement areas appear to create a noticeable sense of "
            "movement, but final judgment should still come from listening."
        )

    return (
        "Check whether the track develops enough new tension, variation, or a "
        "memorable lift across the larger arrangement areas."
    )
