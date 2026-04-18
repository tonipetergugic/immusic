from __future__ import annotations

from typing import Any

from analysis_engine.schemas import AnalysisIssue


ALLOWED_SEVERITIES = {"info", "warning", "error"}


def create_issue(
    code: str,
    severity: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_severity = severity.strip().lower()

    if normalized_severity not in ALLOWED_SEVERITIES:
        raise ValueError(
            f"Invalid issue severity '{severity}'. "
            f"Allowed: {sorted(ALLOWED_SEVERITIES)}"
        )

    issue = AnalysisIssue(
        code=code.strip(),
        severity=normalized_severity,
        message=message.strip(),
        details=details or {},
    )
    return issue.to_dict()


def append_issue(
    issues: list[dict[str, Any]],
    code: str,
    severity: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    issues.append(create_issue(code, severity, message, details))
    return issues


def extend_issues(
    issues: list[dict[str, Any]],
    new_issues: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    if not new_issues:
        return issues

    issues.extend(new_issues)
    return issues
