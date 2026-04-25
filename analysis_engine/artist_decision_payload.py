from __future__ import annotations

from typing import Any, Mapping

AnalysisData = Mapping[str, Any]
DecisionPayload = dict[str, Any]

TECHNICAL_AREAS: tuple[str, ...] = (
    "loudness",
    "peaks",
    "dynamics",
    "stereo",
    "low_end",
    "file",
)

TECHNICAL_LABELS: dict[str, str] = {
    "loudness": "Loudness",
    "peaks": "Peaks",
    "dynamics": "Dynamics",
    "stereo": "Stereo",
    "low_end": "Low End",
    "file": "File",
}


def build_artist_decision_payload(analysis: AnalysisData) -> DecisionPayload:
    """Build the first artist-facing Decision Center payload from analysis.json data.

    The builder intentionally uses only high-level issues and metric availability.
    It does not invent hard technical thresholds. Detailed calibration belongs in
    the analysis engine modules that produce explicit issues.
    """

    issues = _normalise_issues(analysis.get("issues"))
    technical_checks = _build_technical_release_checks(analysis, issues)
    release_readiness = _build_release_readiness(analysis, issues)
    track_status = _build_track_status(release_readiness)
    critical_warnings = _build_critical_warnings(issues)
    next_step = _build_next_step(release_readiness, issues)
    optional_feedback = _build_optional_feedback(analysis)
    meta_warnings = _build_meta_warnings(analysis)

    return {
        "track": _build_track(analysis),
        "track_status": track_status,
        "release_readiness": release_readiness,
        "critical_warnings": critical_warnings,
        "technical_release_checks": technical_checks,
        "next_step": next_step,
        "optional_feedback": optional_feedback,
        "meta": {
            "source": "analysis_engine",
            "created_at": None,
            "warnings": meta_warnings,
        },
    }


def _build_track(analysis: AnalysisData) -> dict[str, Any]:
    file_info = _as_mapping(analysis.get("file_info"))
    product_payload = _as_mapping(analysis.get("product_payload"))
    product_track = _as_mapping(product_payload.get("track"))
    summary = _as_mapping(analysis.get("summary"))

    title = _first_present_string(
        product_track.get("title"),
        product_track.get("filename"),
        file_info.get("stem"),
        file_info.get("filename"),
        summary.get("filename"),
        "Untitled track",
    )

    return _drop_none(
        {
            "title": title,
            "artist_name": _first_present_string_or_none(
                product_track.get("artist_name"),
                product_track.get("artist"),
                file_info.get("artist_name"),
            ),
            "artwork_url": _first_present_string_or_none(
                product_track.get("artwork_url"),
                product_track.get("cover_url"),
                file_info.get("artwork_url"),
            ),
            "main_genre": _first_present_string_or_none(
                product_track.get("main_genre"),
                file_info.get("main_genre"),
            ),
            "subgenre": _first_present_string_or_none(
                product_track.get("subgenre"),
                product_track.get("genre"),
                file_info.get("subgenre"),
                file_info.get("genre"),
            ),
            "bpm": _first_present_number(
                product_track.get("bpm"),
                file_info.get("bpm"),
            ),
            "key": _first_present_string_or_none(
                product_track.get("key"),
                file_info.get("key"),
            ),
            "duration_sec": _first_present_number(
                product_track.get("duration_sec"),
                file_info.get("duration_sec"),
                summary.get("duration_sec"),
            ),
        }
    )


def _build_track_status(release_readiness: Mapping[str, Any]) -> dict[str, str]:
    state = str(release_readiness.get("state") or "incomplete")

    if state == "ready":
        return {
            "label": "Ready",
            "text": "The track check is complete and no critical release issue was reported.",
        }

    if state == "almost_ready":
        return {
            "label": "Almost ready",
            "text": "The track check is complete. One point should be reviewed before release.",
        }

    if state == "needs_revision":
        return {
            "label": "Revision recommended",
            "text": "The track check is complete. Some technical points should be revised before release.",
        }

    if state == "blocked":
        return {
            "label": "Not releaseable",
            "text": "The track check found a critical issue that should be fixed before release.",
        }

    return {
        "label": "Check incomplete",
        "text": "The track check could not produce a complete release decision.",
    }


def _build_release_readiness(
    analysis: AnalysisData,
    issues: list[dict[str, Any]],
) -> dict[str, Any]:
    has_minimum_analysis = bool(
        _as_mapping(analysis.get("file_info"))
        or _as_mapping(analysis.get("product_payload"))
        or _as_mapping(analysis.get("summary"))
    )

    if not has_minimum_analysis:
        return {
            "state": "incomplete",
            "label": "INCOMPLETE",
            "text": "The analysis data is incomplete, so no reliable release decision can be shown.",
        }

    problem_issues = [issue for issue in issues if issue["severity"] == "problem"]
    warning_issues = [issue for issue in issues if issue["severity"] == "warning"]

    if problem_issues:
        first_issue = problem_issues[0]
        return {
            "state": "blocked",
            "label": "BLOCKED",
            "text": f"The track should not be released until this issue is fixed: {first_issue['title']}.",
        }

    if len(warning_issues) >= 2:
        return {
            "state": "needs_revision",
            "label": "NEEDS REVISION",
            "text": "The track is not blocked, but multiple points should be reviewed before release.",
        }

    if len(warning_issues) == 1:
        return {
            "state": "almost_ready",
            "label": "ALMOST READY",
            "text": "The track looks close to release-ready, but one point should be checked first.",
        }

    return {
        "state": "ready",
        "label": "READY",
        "text": "The track is technically release-ready based on the current track check.",
    }


def _build_critical_warnings(issues: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "title": issue["title"],
            "text": issue["text"],
            "severity": issue["severity"],
            "area": issue["area"],
        }
        for issue in issues
        if issue["severity"] in {"warning", "problem"}
    ]


def _build_technical_release_checks(
    analysis: AnalysisData,
    issues: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []

    for area in TECHNICAL_AREAS:
        source = _metric_source_for_area(analysis, area)
        area_issues = [issue for issue in issues if issue["area"] == area]
        state = _technical_state(source, area_issues)
        checks.append(
            {
                "area": area,
                "label": TECHNICAL_LABELS[area],
                "state": state,
                "short_text": _technical_short_text(state, area_issues),
            }
        )

    return checks


def _build_next_step(
    release_readiness: Mapping[str, Any],
    issues: list[dict[str, Any]],
) -> dict[str, str]:
    state = str(release_readiness.get("state") or "incomplete")

    if state == "incomplete":
        return {
            "title": "Run the track check again",
            "text": "The analysis data is incomplete. Run the track check again before making a release decision.",
            "button_label": "Run check again",
            "action_type": "run_track_check_again",
        }

    if _has_issue(issues, area="file", severity="problem"):
        return {
            "title": "Upload the file again",
            "text": "The file check reported a critical issue. Upload a clean audio file and run the check again.",
            "button_label": "Upload again",
            "action_type": "upload_file_again",
        }

    if _has_issue(issues, area="peaks", severity="problem") or _has_issue(
        issues, area="loudness", severity="problem"
    ):
        return {
            "title": "Revise the master",
            "text": "A critical loudness or peak issue was reported. Revise the master before release.",
            "button_label": "Check master",
            "action_type": "revise_master",
        }

    if _has_issue(issues, area="low_end"):
        return {
            "title": "Check the low end",
            "text": "The low-end area should be checked before release.",
            "button_label": "Check low end",
            "action_type": "check_low_end",
        }

    if _has_issue(issues, area="dynamics") or _has_issue(issues, area="stereo"):
        return {
            "title": "Check the mix",
            "text": "The mix should be reviewed before release.",
            "button_label": "Check mix",
            "action_type": "check_mix",
        }

    if state in {"blocked", "needs_revision"}:
        return {
            "title": "Manual review recommended",
            "text": "Review the reported issue before deciding on the release.",
            "button_label": "Review issue",
            "action_type": "manual_review",
        }

    if state == "almost_ready":
        return {
            "title": "Review the warning",
            "text": "Review the remaining warning, then decide whether the track is ready for release.",
            "button_label": "Review warning",
            "action_type": "manual_review",
        }

    return {
        "title": "Prepare the release",
        "text": "No critical release issue was reported. You can continue preparing the release.",
        "button_label": "Prepare release",
        "action_type": "prepare_release",
    }


def _build_optional_feedback(analysis: AnalysisData) -> dict[str, Any]:
    has_consultant_input = bool(_as_mapping(analysis.get("consultant_input")))
    has_product_payload = bool(_as_mapping(analysis.get("product_payload")))

    return {
        "available": has_consultant_input or has_product_payload,
        "locked": True,
        "label": "AI Consultant & detailed feedback",
        "text": "Optional premium feedback can explain the track check in more detail.",
    }


def _build_meta_warnings(analysis: AnalysisData) -> list[str]:
    warnings: list[str] = []

    if not _as_mapping(analysis.get("product_payload")):
        warnings.append("product_payload is missing.")

    if not _as_mapping(analysis.get("consultant_input")):
        warnings.append("consultant_input is missing.")

    if not _as_mapping(analysis.get("loudness")):
        warnings.append("loudness metrics are missing.")

    if not _as_mapping(analysis.get("dynamics")):
        warnings.append("dynamics metrics are missing.")

    if not _as_mapping(analysis.get("stereo")):
        warnings.append("stereo metrics are missing.")

    if not _as_mapping(analysis.get("low_end")):
        warnings.append("low_end metrics are missing.")

    return warnings


def _metric_source_for_area(analysis: AnalysisData, area: str) -> Mapping[str, Any]:
    if area == "peaks":
        return _as_mapping(analysis.get("loudness"))

    if area == "file":
        return _as_mapping(analysis.get("file_info"))

    return _as_mapping(analysis.get(area))


def _technical_state(
    source: Mapping[str, Any],
    area_issues: list[dict[str, Any]],
) -> str:
    if any(issue["severity"] == "problem" for issue in area_issues):
        return "problem"

    if any(issue["severity"] == "warning" for issue in area_issues):
        return "warning"

    if not source:
        return "unavailable"

    return "ok"


def _technical_short_text(
    state: str,
    area_issues: list[dict[str, Any]],
) -> str:
    if area_issues:
        return str(area_issues[0]["text"])

    if state == "unavailable":
        return "No measurement available yet."

    if state == "ok":
        return "Measurement available. No critical issue reported."

    return "Review recommended."


def _normalise_issues(raw_issues: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_issues, list):
        return []

    normalised: list[dict[str, Any]] = []

    for raw_issue in raw_issues:
        if isinstance(raw_issue, str):
            text = raw_issue.strip()
            if not text:
                continue

            normalised.append(
                {
                    "title": "Check recommended",
                    "text": text,
                    "severity": "warning",
                    "area": _normalise_area(text),
                }
            )
            continue

        issue = _as_mapping(raw_issue)
        if not issue:
            continue

        title = _first_present_string(
            issue.get("title"),
            issue.get("code"),
            issue.get("name"),
            "Check recommended",
        )
        text = _first_present_string(
            issue.get("text"),
            issue.get("message"),
            issue.get("description"),
            title,
        )

        normalised.append(
            {
                "title": title,
                "text": text,
                "severity": _normalise_severity(issue),
                "area": _normalise_area(
                    _first_present_string(
                        issue.get("area"),
                        issue.get("category"),
                        issue.get("code"),
                        title,
                        text,
                    )
                ),
            }
        )

    return normalised


def _normalise_severity(issue: Mapping[str, Any]) -> str:
    raw_value = _first_present_string(
        issue.get("severity"),
        issue.get("level"),
        issue.get("status"),
        issue.get("type"),
        "",
    ).lower()

    if raw_value in {"critical", "error", "blocker", "blocked", "problem", "fail", "failed"}:
        return "problem"

    return "warning"


def _normalise_area(raw_value: Any) -> str:
    value = str(raw_value or "").lower()

    if "peak" in value or "clip" in value:
        return "peaks"

    if "loud" in value or "lufs" in value or "master" in value:
        return "loudness"

    if "dynamic" in value or "crest" in value or "plr" in value or "rms" in value:
        return "dynamics"

    if "stereo" in value or "phase" in value or "mono" in value:
        return "stereo"

    if "low" in value or "bass" in value or "sub" in value:
        return "low_end"

    if "file" in value or "codec" in value or "format" in value or "audio" in value:
        return "file"

    return "other"


def _has_issue(
    issues: list[dict[str, Any]],
    *,
    area: str,
    severity: str | None = None,
) -> bool:
    return any(
        issue["area"] == area and (severity is None or issue["severity"] == severity)
        for issue in issues
    )


def _as_mapping(value: Any) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value

    return {}


def _first_present_string(*values: Any) -> str:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()

        if value is not None and not isinstance(value, (dict, list, tuple, set)):
            text = str(value).strip()
            if text:
                return text

    return ""


def _first_present_string_or_none(*values: Any) -> str | None:
    value = _first_present_string(*values)
    return value or None


def _first_present_number(*values: Any) -> float | int | None:
    for value in values:
        if isinstance(value, bool):
            continue

        if isinstance(value, (int, float)):
            return value

        if isinstance(value, str):
            try:
                number = float(value)
            except ValueError:
                continue

            if number.is_integer():
                return int(number)

            return number

    return None


def _drop_none(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if value is not None}
