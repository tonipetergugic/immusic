export function headroomHealthFromCodecSim(codecSim: any): {
  highlight: string;
  severity: "info" | "warn" | "critical";
} | null {
  if (!codecSim) return null;

  const pre =
    typeof codecSim?.pre_true_peak_db === "number" && Number.isFinite(codecSim.pre_true_peak_db)
      ? codecSim.pre_true_peak_db
      : null;

  const aacPost =
    typeof codecSim?.aac128?.post_true_peak_db === "number" &&
    Number.isFinite(codecSim.aac128.post_true_peak_db)
      ? codecSim.aac128.post_true_peak_db
      : null;

  const mp3Post =
    typeof codecSim?.mp3128?.post_true_peak_db === "number" &&
    Number.isFinite(codecSim.mp3128.post_true_peak_db)
      ? codecSim.mp3128.post_true_peak_db
      : null;

  if (pre === null || (aacPost === null && mp3Post === null)) return null;

  // Worst-case post-encode true peak (closest to +infinity)
  const worstPost = Math.max(
    aacPost === null ? -999 : aacPost,
    mp3Post === null ? -999 : mp3Post,
  );

  // Headroom to 0.0 dBTP AFTER encoding (positive means still below 0.0)
  const headroomToZero = 0.0 - worstPost;

  // Deterministic thresholds (purely technical):
  // - <= 0.00 dBTP: already over -> critical
  // - <= 0.10 dBTP: extremely tight -> critical
  // - <= 0.30 dBTP: tight -> warn
  // - else: info
  if (headroomToZero <= 0) {
    return {
      severity: "critical",
      highlight: `Streaming headroom (post-encode) is negative (${headroomToZero.toFixed(
        3,
      )} dBTP): worst-case True Peak ${worstPost.toFixed(
        3,
      )} dBTP — high risk of audible distortion.`,
    };
  }

  if (headroomToZero <= 0.1) {
    return {
      severity: "critical",
      highlight: `Only ${headroomToZero.toFixed(
        2,
      )} dBTP streaming headroom (post-encode) — high encoding risk (worst-case True Peak ${worstPost.toFixed(
        3,
      )} dBTP).`,
    };
  }

  if (headroomToZero <= 0.3) {
    return {
      severity: "warn",
      highlight: `Low streaming headroom (post-encode): ${headroomToZero.toFixed(
        2,
      )} dBTP — may clip on some platforms (worst-case True Peak ${worstPost.toFixed(
        3,
      )} dBTP).`,
    };
  }

  return {
    severity: "info",
    highlight: `Streaming headroom (post-encode) looks healthy: ${headroomToZero.toFixed(
      2,
    )} dBTP (worst-case True Peak ${worstPost.toFixed(3)} dBTP).`,
  };
}

export function recommendedLimiterCeilingTextV1(codecSim: any): string | null {
  const aacPost =
    typeof codecSim?.aac128?.post_true_peak_db === "number"
      ? codecSim.aac128.post_true_peak_db
      : null;
  const mp3Post =
    typeof codecSim?.mp3128?.post_true_peak_db === "number"
      ? codecSim.mp3128.post_true_peak_db
      : null;

  if (aacPost === null && mp3Post === null) return null;

  const worstPost = Math.max(aacPost ?? -999, mp3Post ?? -999);

  // Sicherheitsmarge-Policy (Preflight, keine Sperre):
  // Wenn Post-Encode True Peak nahe 0 dBTP liegt, empfehlen wir -1.0 dBTP Ceiling.
  // "Nahe 0" definieren wir als >= -0.2 dBTP.
  if (worstPost >= -0.2) {
    return "Tip: Keep true peak ceiling around -1.0 dBTP to add streaming headroom (reduces encoding overs/distortion risk).";
  }

  return null;
}

export function headroomHealthFromSourceTruePeak(truePeakDbTp: any): {
  highlight: string;
  severity: "info" | "warn" | "critical";
} | null {
  const tp =
    typeof truePeakDbTp === "number" && Number.isFinite(truePeakDbTp)
      ? truePeakDbTp
      : null;

  if (tp === null) return null;

  // Headroom to 0.0 dBTP at SOURCE (pre-encode). Positive means below 0.0 dBTP.
  const headroomToZero = 0.0 - tp;

  // Deterministic thresholds (purely technical, informational only):
  // - <= 0.00 dBTP: already over -> critical
  // - <= 0.10 dBTP: extremely tight -> critical
  // - <= 0.30 dBTP: tight -> warn
  // - else: info
  if (headroomToZero <= 0) {
    return {
      severity: "critical",
      highlight: `Headroom (source) is negative (${headroomToZero.toFixed(
        3,
      )} dBTP): True Peak ${tp.toFixed(3)} dBTP — high encoding risk.`,
    };
  }

  if (headroomToZero <= 0.1) {
    return {
      severity: "critical",
      highlight: `Headroom (source): only ${headroomToZero.toFixed(
        2,
      )} dBTP → high encoding risk (True Peak ${tp.toFixed(3)} dBTP).`,
    };
  }

  if (headroomToZero <= 0.3) {
    return {
      severity: "warn",
      highlight: `Headroom (source): ${headroomToZero.toFixed(
        2,
      )} dBTP → low encoding headroom (True Peak ${tp.toFixed(3)} dBTP).`,
    };
  }

  return {
    severity: "info",
    highlight: `Headroom (source) looks healthy: ${headroomToZero.toFixed(
      2,
    )} dBTP (True Peak ${tp.toFixed(3)} dBTP).`,
  };
}

