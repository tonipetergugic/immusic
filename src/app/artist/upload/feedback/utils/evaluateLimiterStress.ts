export type EvaluationTone = "good" | "warn" | "critical";

export type LimiterEvaluation = {
  tone: EvaluationTone;
  eventsPerMin: number | null;
  maxInWindow: number | null;
};

export default function evaluateLimiterStress(
  truePeakOvers: { t0: number }[] | null,
  durationS: number | null
): LimiterEvaluation {
  if (!truePeakOvers || !durationS || durationS <= 0) {
    return {
      tone: "warn",
      eventsPerMin: null,
      maxInWindow: null,
    };
  }

  const eventsPerMin = (truePeakOvers.length / durationS) * 60;

  let maxW = 0;
  const windowSize = 10;

  for (let i = 0; i < truePeakOvers.length; i++) {
    const start = truePeakOvers[i].t0;
    let count = 0;

    for (let j = i; j < truePeakOvers.length; j++) {
      if (truePeakOvers[j].t0 <= start + windowSize) {
        count++;
      } else {
        break;
      }
    }

    if (count > maxW) maxW = count;
  }

  let tone: EvaluationTone = "good";

  if (eventsPerMin < 20 && maxW < 8) {
    tone = "good";
  } else if (eventsPerMin > 60 || maxW > 20) {
    tone = "critical";
  } else {
    tone = "warn";
  }

  return {
    tone,
    eventsPerMin,
    maxInWindow: maxW,
  };
}
