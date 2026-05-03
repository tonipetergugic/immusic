from __future__ import annotations

import math

from analysis_engine.schemas import (
    DynamicsMetrics,
    LimiterStressMetrics,
    LowEndMetrics,
    MixBasisCheck,
    MixBasisMetrics,
    SpectralRmsMetrics,
    StereoMetrics,
    TransientsMetrics,
)


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


def _rounded(value: object) -> float | None:
    if not _is_number(value):
        return None
    return round(float(value), 3)


def _signal_groups(
    *,
    stereo: StereoMetrics,
    low_end: LowEndMetrics,
    spectral_rms: SpectralRmsMetrics,
    dynamics: DynamicsMetrics,
    limiter_stress: LimiterStressMetrics,
    transients: TransientsMetrics,
) -> list[str]:
    groups: list[str] = []

    if any(
        _is_number(value)
        for value in (
            stereo.side_mid_ratio,
            stereo.phase_correlation,
            stereo.stereo_width,
            stereo.left_right_balance_db,
        )
    ):
        groups.append("stereo")

    if any(
        _is_number(value)
        for value in (
            low_end.mono_loss_low_band_percent,
            low_end.phase_correlation_low_band,
            low_end.low_band_balance_db,
        )
    ):
        groups.append("low_end")

    if spectral_rms.status == "available" or any(
        _is_number(value)
        for value in (
            spectral_rms.sub_rms_dbfs,
            spectral_rms.low_rms_dbfs,
            spectral_rms.mid_rms_dbfs,
            spectral_rms.high_rms_dbfs,
            spectral_rms.air_rms_dbfs,
        )
    ):
        groups.append("spectral_rms")

    if any(
        _is_number(value)
        for value in (
            dynamics.crest_factor_db,
            dynamics.integrated_rms_dbfs,
            dynamics.plr_lu,
        )
    ):
        groups.append("dynamics")

    if limiter_stress.status != "not_available" or any(
        _is_number(value)
        for value in (
            limiter_stress.events_per_min,
            limiter_stress.max_events_per_10s,
            limiter_stress.p95_events_per_10s,
        )
    ):
        groups.append("limiter_stress")

    if transients.status != "not_available" or any(
        _is_number(value)
        for value in (
            transients.attack_strength,
            transients.transient_density_per_sec,
            transients.mean_short_crest_db,
            transients.p95_short_crest_db,
            transients.transient_density_cv,
        )
    ):
        groups.append("transients")

    return groups


def _left_right_balance_check(stereo: StereoMetrics) -> MixBasisCheck:
    balance = stereo.left_right_balance_db

    if not _is_number(balance):
        return MixBasisCheck(
            id="left_right_balance_check",
            status="not_available",
            confidence="low",
            area="stereo_balance",
            headline="Left/right balance could not be checked.",
            observation="No reliable full-band left/right balance value is available.",
            listening_check="Reference-check whether the mix feels balanced between left and right.",
            evidence={},
        )

    abs_balance = abs(float(balance))
    if abs_balance >= 3.0:
        status = "suspect"
    elif abs_balance >= 1.5:
        status = "watch"
    else:
        status = "ok"

    return MixBasisCheck(
        id="left_right_balance_check",
        status=status,
        confidence="medium",
        area="stereo_balance",
        headline="Reference-check the left/right balance.",
        observation="The measured full-band balance may indicate that one side is stronger than the other."
        if status != "ok"
        else "The measured full-band left/right balance looks controlled.",
        listening_check="Reference-check whether the mix feels balanced between left and right.",
        evidence={
            "left_right_balance_db": _rounded(balance),
            "meaning": "positive means left stronger, negative means right stronger",
        },
    )


def _center_focus_tendency(stereo: StereoMetrics) -> MixBasisCheck:
    evidence = {
        "side_mid_ratio": _rounded(stereo.side_mid_ratio),
        "stereo_width": _rounded(stereo.stereo_width),
        "phase_correlation": _rounded(stereo.phase_correlation),
        "left_right_balance_db": _rounded(stereo.left_right_balance_db),
    }
    available_values = [value for value in evidence.values() if _is_number(value)]

    if len(available_values) < 2:
        return MixBasisCheck(
            id="center_focus_tendency",
            status="not_available",
            confidence="low",
            area="center_stability",
            headline="Center focus could not be checked.",
            observation="There are not enough stable stereo indicators to derive a center-focus tendency.",
            listening_check="Check whether important center elements stay stable and clear in stereo and mono.",
            evidence=evidence,
        )

    suspect_signals = 0
    watch_signals = 0

    if _is_number(stereo.phase_correlation):
        if float(stereo.phase_correlation) < 0.0:
            suspect_signals += 1
        elif float(stereo.phase_correlation) < 0.25:
            watch_signals += 1

    if _is_number(stereo.side_mid_ratio):
        if float(stereo.side_mid_ratio) >= 1.0:
            suspect_signals += 1
        elif float(stereo.side_mid_ratio) >= 0.65:
            watch_signals += 1

    if _is_number(stereo.left_right_balance_db):
        if abs(float(stereo.left_right_balance_db)) >= 4.0:
            suspect_signals += 1
        elif abs(float(stereo.left_right_balance_db)) >= 2.0:
            watch_signals += 1

    if suspect_signals > 0:
        status = "suspect"
    elif watch_signals > 0:
        status = "watch"
    else:
        status = "ok"

    return MixBasisCheck(
        id="center_focus_tendency",
        status=status,
        confidence="medium",
        area="center_stability",
        headline="Reference-check the center focus.",
        observation="Stereo indicators may suggest that important center elements need a focused listening check."
        if status != "ok"
        else "The available stereo indicators do not suggest an obvious center-focus concern.",
        listening_check="Check whether important center elements stay stable and clear in stereo and mono.",
        evidence=evidence,
    )


def _low_mid_mud_tendency(spectral_rms: SpectralRmsMetrics) -> MixBasisCheck:
    low = spectral_rms.low_rms_dbfs
    mid = spectral_rms.mid_rms_dbfs

    if not _is_number(low) or not _is_number(mid):
        return MixBasisCheck(
            id="low_mid_mud_tendency",
            status="not_available",
            confidence="low",
            area="spectral_balance",
            headline="Low-mid balance could not be checked.",
            observation="The required low and mid band RMS values are not available.",
            listening_check="Compare the bass, kick, lower mids, and main musical body against a trusted reference.",
            evidence={
                "low_rms_dbfs": _rounded(low),
                "mid_rms_dbfs": _rounded(mid),
            },
        )

    low_minus_mid_db = float(low) - float(mid)

    if low_minus_mid_db >= 6.0:
        status = "suspect"
    elif low_minus_mid_db >= 3.0:
        status = "watch"
    else:
        status = "ok"

    return MixBasisCheck(
        id="low_mid_mud_tendency",
        status=status,
        confidence="medium",
        area="spectral_balance",
        headline="Reference-check the low-mid balance.",
        observation="The measured band balance may indicate a crowded lower body."
        if status != "ok"
        else "The measured low-to-mid band balance does not show an obvious low-mid buildup.",
        listening_check="Compare the bass, kick, lower mids, and main musical body against a trusted reference.",
        evidence={
            "low_rms_dbfs": _rounded(low),
            "mid_rms_dbfs": _rounded(mid),
            "low_minus_mid_db": _rounded(low_minus_mid_db),
        },
    )


def _upper_harshness_tendency(spectral_rms: SpectralRmsMetrics) -> MixBasisCheck:
    mid = spectral_rms.mid_rms_dbfs
    high = spectral_rms.high_rms_dbfs
    air = spectral_rms.air_rms_dbfs

    if not _is_number(mid) or (not _is_number(high) and not _is_number(air)):
        return MixBasisCheck(
            id="upper_harshness_tendency",
            status="not_available",
            confidence="low",
            area="spectral_balance",
            headline="Upper balance could not be checked.",
            observation="The required mid/high/air band RMS values are not available.",
            listening_check="Check whether bright elements feel sharp, tiring, or too forward against a trusted reference.",
            evidence={
                "mid_rms_dbfs": _rounded(mid),
                "high_rms_dbfs": _rounded(high),
                "air_rms_dbfs": _rounded(air),
            },
        )

    high_minus_mid_db = float(high) - float(mid) if _is_number(high) else None
    air_minus_mid_db = float(air) - float(mid) if _is_number(air) else None
    upper_deltas = [
        value for value in (high_minus_mid_db, air_minus_mid_db) if _is_number(value)
    ]
    max_upper_delta = max(upper_deltas) if upper_deltas else None

    if _is_number(max_upper_delta) and float(max_upper_delta) >= 6.0:
        status = "suspect"
    elif _is_number(max_upper_delta) and float(max_upper_delta) >= 3.0:
        status = "watch"
    else:
        status = "ok"

    return MixBasisCheck(
        id="upper_harshness_tendency",
        status=status,
        confidence="medium",
        area="spectral_balance",
        headline="Reference-check the upper balance.",
        observation="The measured upper-band balance may indicate prominent bright content."
        if status != "ok"
        else "The measured upper-band balance does not show an obvious harshness tendency.",
        listening_check="Check whether bright elements feel sharp, tiring, or too forward against a trusted reference.",
        evidence={
            "mid_rms_dbfs": _rounded(mid),
            "high_rms_dbfs": _rounded(high),
            "air_rms_dbfs": _rounded(air),
            "high_minus_mid_db": _rounded(high_minus_mid_db),
            "air_minus_mid_db": _rounded(air_minus_mid_db),
        },
    )


def build_mix_basis(
    *,
    stereo: StereoMetrics,
    low_end: LowEndMetrics,
    spectral_rms: SpectralRmsMetrics,
    dynamics: DynamicsMetrics,
    limiter_stress: LimiterStressMetrics,
    transients: TransientsMetrics,
) -> MixBasisMetrics:
    groups = _signal_groups(
        stereo=stereo,
        low_end=low_end,
        spectral_rms=spectral_rms,
        dynamics=dynamics,
        limiter_stress=limiter_stress,
        transients=transients,
    )

    if not groups:
        return MixBasisMetrics(
            status="not_available",
            confidence="low",
            available_signal_groups=[],
            checks=[],
        )

    checks = [
        _left_right_balance_check(stereo),
        _center_focus_tendency(stereo),
        _low_mid_mud_tendency(spectral_rms),
        _upper_harshness_tendency(spectral_rms),
    ]

    available_checks = [check for check in checks if check.status != "not_available"]
    if not available_checks:
        status = "not_available"
        confidence = "low"
    elif len(available_checks) < len(checks):
        status = "partial"
        confidence = "medium"
    else:
        status = "available"
        confidence = "medium"

    return MixBasisMetrics(
        status=status,
        confidence=confidence,
        available_signal_groups=groups,
        checks=checks,
    )
