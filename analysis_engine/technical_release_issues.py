from __future__ import annotations

from typing import Any

from analysis_engine.issues import create_issue
from analysis_engine.schemas import (
    DynamicsMetrics,
    LoudnessMetrics,
    LowEndMetrics,
    StereoMetrics,
)


def collect_technical_release_issues(
    *,
    loudness: LoudnessMetrics,
    dynamics: DynamicsMetrics,
    stereo: StereoMetrics,
    low_end: LowEndMetrics,
) -> list[dict[str, Any]]:
    """
    Technical release issue layer.

    Purpose:
    - Convert existing measured technical metrics into release-facing issues.
    - Keep measurement modules clean.
    - Reuse the proven old KI-check policy where the same metrics exist.
    - Do not create info issues here, because artist_decision_payload currently treats
      non-error severities as warnings.

    Current scope:
    - Source true peak / headroom
    - Low-end mono stability
    - Very compressed dynamics suspicion
    - Global stereo phase suspicion

    Not included yet:
    - Post-encode codec simulation, because the Python engine does not generate it yet.
    - Clipped sample count, because the Python engine does not measure it yet.
    """
    issues: list[dict[str, Any]] = []

    issues.extend(_collect_true_peak_issues(loudness))
    issues.extend(_collect_low_end_issues(low_end))
    issues.extend(_collect_dynamics_issues(dynamics))
    issues.extend(_collect_stereo_issues(stereo))

    return issues


def _collect_true_peak_issues(loudness: LoudnessMetrics) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    true_peak = _finite_number(loudness.true_peak_dbtp)
    if true_peak is None:
        return issues

    # Old KI-check hard-fail policy:
    # Hard fail only for objectively extreme true peak overs above +2.0 dBTP.
    if true_peak > 2.0:
        issues.append(
            create_issue(
                code="true_peak_over_2_0_dbtp",
                severity="error",
                message=(
                    f"True Peak is very high at {true_peak:.2f} dBTP. "
                    "This is an objective technical release blocker."
                ),
                details={
                    "area": "peaks",
                    "metric": "true_peak_dbtp",
                    "value": true_peak,
                    "threshold": 2.0,
                    "source_rule": "old_ki_check_hard_fail_policy",
                },
            )
        )
        return issues

    headroom_to_zero = 0.0 - true_peak

    # Old headroom policy:
    # <= 0.00 dBTP = over zero, warning in the new mandatory Track Check layer
    # unless it crosses the hard-fail line above.
    if headroom_to_zero <= 0.0:
        issues.append(
            create_issue(
                code="source_true_peak_over_zero_dbtp",
                severity="warning",
                message=(
                    f"True Peak is above 0.0 dBTP at {true_peak:.2f} dBTP. "
                    "Check limiter ceiling before release."
                ),
                details={
                    "area": "peaks",
                    "metric": "true_peak_dbtp",
                    "value": true_peak,
                    "headroom_to_zero_dbtp": headroom_to_zero,
                    "threshold": 0.0,
                    "source_rule": "old_headroom_health_source_true_peak",
                },
            )
        )
        return issues

    # Old headroom policy:
    # <= 0.30 dBTP remaining headroom = tight source headroom.
    if headroom_to_zero <= 0.3:
        issues.append(
            create_issue(
                code="source_true_peak_tight_headroom",
                severity="warning",
                message=(
                    f"Source headroom is tight at {headroom_to_zero:.2f} dBTP. "
                    "Check limiter ceiling before release."
                ),
                details={
                    "area": "peaks",
                    "metric": "true_peak_dbtp",
                    "value": true_peak,
                    "headroom_to_zero_dbtp": headroom_to_zero,
                    "threshold": 0.3,
                    "source_rule": "old_headroom_health_source_true_peak",
                },
            )
        )

    return issues


def _collect_low_end_issues(low_end: LowEndMetrics) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    phase_corr = _finite_number(low_end.phase_correlation_low_band)
    mono_loss = _finite_number(low_end.mono_loss_low_band_percent)

    if phase_corr is None and mono_loss is None:
        return issues

    # Old low-end policy:
    # Critical: phase correlation < 0 OR mono loss > 30%
    critical = (
        (phase_corr is not None and phase_corr < 0.0)
        or (mono_loss is not None and mono_loss > 30.0)
    )

    # Old low-end policy:
    # High risk: phase correlation < 0.2 OR mono loss > 15%
    high_risk = (
        (phase_corr is not None and phase_corr < 0.2)
        or (mono_loss is not None and mono_loss > 15.0)
    )

    if critical:
        issues.append(
            create_issue(
                code="low_end_mono_stability_critical",
                severity="error",
                message=(
                    "Low-end mono stability is critical. "
                    "Bass may disappear or become unstable on mono playback systems."
                ),
                details={
                    "area": "low_end",
                    "phase_correlation_low_band": phase_corr,
                    "mono_loss_low_band_percent": mono_loss,
                    "phase_correlation_threshold": 0.0,
                    "mono_loss_threshold_percent": 30.0,
                    "source_rule": "old_low_end_mono_stability_health",
                },
            )
        )
        return issues

    if high_risk:
        issues.append(
            create_issue(
                code="low_end_mono_stability_high_risk",
                severity="warning",
                message=(
                    "Low-end mono stability looks risky. "
                    "Check sub/bass phase before release."
                ),
                details={
                    "area": "low_end",
                    "phase_correlation_low_band": phase_corr,
                    "mono_loss_low_band_percent": mono_loss,
                    "phase_correlation_threshold": 0.2,
                    "mono_loss_threshold_percent": 15.0,
                    "source_rule": "old_low_end_mono_stability_health",
                },
            )
        )

    return issues


def _collect_dynamics_issues(dynamics: DynamicsMetrics) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    plr = _finite_number(dynamics.plr_lu)
    crest = _finite_number(dynamics.crest_factor_db)

    # Conservative warning only.
    # Dynamics are not hard-fail rules in the old KI-check policy.
    if plr is not None and plr <= 5.0:
        issues.append(
            create_issue(
                code="very_low_plr_lu",
                severity="warning",
                message=(
                    f"Peak-to-loudness range is very low at {plr:.2f} LU. "
                    "Check whether the master is over-limited."
                ),
                details={
                    "area": "dynamics",
                    "metric": "plr_lu",
                    "value": plr,
                    "threshold": 5.0,
                    "source_rule": "old_ki_check_feedback_signal",
                },
            )
        )
        return issues

    if crest is not None and crest <= 5.0:
        issues.append(
            create_issue(
                code="very_low_crest_factor_db",
                severity="warning",
                message=(
                    f"Crest factor is very low at {crest:.2f} dB. "
                    "Check whether the master is over-compressed."
                ),
                details={
                    "area": "dynamics",
                    "metric": "crest_factor_db",
                    "value": crest,
                    "threshold": 5.0,
                    "source_rule": "old_ki_check_feedback_signal",
                },
            )
        )

    return issues


def _collect_stereo_issues(stereo: StereoMetrics) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    phase_corr = _finite_number(stereo.phase_correlation)
    if phase_corr is None:
        return issues

    # Conservative warning only.
    # Full-band stereo phase can be creative, so it should not block release here.
    if phase_corr < -0.2:
        issues.append(
            create_issue(
                code="global_stereo_phase_negative",
                severity="warning",
                message=(
                    f"Global stereo phase correlation is negative at {phase_corr:.2f}. "
                    "Check mono compatibility before release."
                ),
                details={
                    "area": "stereo",
                    "metric": "phase_correlation",
                    "value": phase_corr,
                    "threshold": -0.2,
                    "source_rule": "technical_phase_suspicion",
                },
            )
        )

    return issues


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None

    if not isinstance(value, (int, float)):
        return None

    number = float(value)
    if number != number:
        return None

    if number in {float("inf"), float("-inf")}:
        return None

    return number
