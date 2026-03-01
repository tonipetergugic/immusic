type Tone = "good" | "warn" | "critical" | "neutral";

function toneForGain(gainDb: unknown): Tone {
  if (!(typeof gainDb === "number" && Number.isFinite(gainDb))) return "neutral";

  if (gainDb > 0) {
    if (gainDb >= 4) return "critical";
    if (gainDb >= 2) return "warn";
    return "good";
  }

  if (gainDb <= -8) return "critical";
  if (gainDb <= -4) return "warn";
  return "good";
}

function toneForApple(applied: unknown, desired: unknown, maxUp: unknown): Tone {
  const a = typeof applied === "number" && Number.isFinite(applied) ? applied : null;
  const d = typeof desired === "number" && Number.isFinite(desired) ? desired : null;
  const m = typeof maxUp === "number" && Number.isFinite(maxUp) ? maxUp : null;

  if (d !== null && d > 0 && m !== null && m < d) {
    const diff = d - m;
    if (diff >= 3) return "critical";
    if (diff >= 1) return "warn";
  }

  return toneForGain(a);
}

export function getStreamingRiskTone(params: {
  payload: unknown;
  isReady: boolean;
}): "good" | "warn" | "critical" | "neutral" {
  const { payload, isReady } = params;
  if (!isReady || !payload || typeof payload !== "object") return "neutral";

  const sn = (payload as any)?.metrics?.loudness?.streaming_normalization ?? null;
  const spotifyTone = toneForGain(sn?.spotify?.desired_gain_db ?? sn?.spotify?.applied_gain_db);
  const ytTone = toneForGain(sn?.youtube?.applied_gain_db);
  const appleTone = toneForApple(
    sn?.apple_music?.applied_gain_db,
    sn?.apple_music?.desired_gain_db,
    sn?.apple_music?.max_up_gain_db
  );

  const truePeakOvers = Array.isArray((payload as any)?.events?.loudness?.true_peak_overs)
    ? (payload as any).events.loudness.true_peak_overs.length
    : 0;

  if (truePeakOvers > 0) return "critical";
  if (spotifyTone === "critical" || ytTone === "critical" || appleTone === "critical") return "critical";
  if (spotifyTone === "warn" || ytTone === "warn" || appleTone === "warn") return "warn";
  return "good";
}
