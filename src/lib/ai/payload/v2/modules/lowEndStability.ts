export function lowEndMonoStabilityHealth(params: {
  phaseCorr20_120: any;
  monoLossPct20_120: any;
}): {
  severity: "info" | "warn" | "critical";
  highlight: string;
  recSeverity: "info" | "warn" | "critical";
} | null {
  const pc =
    typeof params.phaseCorr20_120 === "number" && Number.isFinite(params.phaseCorr20_120)
      ? params.phaseCorr20_120
      : null;

  const loss =
    typeof params.monoLossPct20_120 === "number" && Number.isFinite(params.monoLossPct20_120)
      ? params.monoLossPct20_120
      : null;

  if (pc === null && loss === null) return null;

  // Deterministic thresholds (technical only; no gating):
  // Phase correlation (20–120 Hz): <0 critical, <0.2 high, <0.5 warn, else ok
  // Mono energy loss (20–120 Hz): >30 critical, >15 high, >5 warn, else ok
  const critical =
    (pc !== null && pc < 0) || (loss !== null && loss > 30);

  const high =
    (pc !== null && pc < 0.2) || (loss !== null && loss > 15);

  const warn =
    (pc !== null && pc < 0.5) || (loss !== null && loss > 5);

  if (critical) {
    const pcTxt = pc === null ? "—" : pc.toFixed(2);
    const lossTxt = loss === null ? "—" : `${loss.toFixed(1)}%`;
    return {
      severity: "critical",
      recSeverity: "critical",
      highlight: `Low-end mono stability (20–120 Hz) is CRITICAL: phase corr ${pcTxt}, mono loss ${lossTxt} → bass may disappear on mono club systems.`,
    };
  }

  if (high) {
    const pcTxt = pc === null ? "—" : pc.toFixed(2);
    const lossTxt = loss === null ? "—" : `${loss.toFixed(1)}%`;
    return {
      severity: "warn",
      recSeverity: "warn",
      highlight: `Low-end mono stability (20–120 Hz) is HIGH RISK: phase corr ${pcTxt}, mono loss ${lossTxt} → check sub stereo/phase.`,
    };
  }

  if (warn) {
    const pcTxt = pc === null ? "—" : pc.toFixed(2);
    const lossTxt = loss === null ? "—" : `${loss.toFixed(1)}%`;
    return {
      severity: "info",
      recSeverity: "info",
      highlight: `Low-end mono stability (20–120 Hz) looks borderline: phase corr ${pcTxt}, mono loss ${lossTxt}.`,
    };
  }

  return null;
}
