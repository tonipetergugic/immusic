import type { AnalyzerMetrics, TrackCheckDecision } from "@/lib/ai/track-check/types";

function countTrue(values: boolean[]): number {
  return values.filter(Boolean).length;
}

/**
 * Conservative analyzer:
 * - no single metric can reject
 * - no single problem group can reject
 * - reject only if at least 2 problem groups are confirmed
 * - designed to catch clearly broken / damaged sounding tracks only
 */
export async function analyzeAudio(metrics: AnalyzerMetrics): Promise<TrackCheckDecision> {
  const loudnessSignals = [
    metrics.crestFactorDb < 4.0,
    metrics.truePeakDbEffective > 0.8,
    metrics.clippedSampleCount >= 800,
  ];

  const stereoSignals = [
    metrics.phaseCorrelation < -0.08,
    metrics.lowEndPhaseCorrelation20_120 < 0.05,
    metrics.lowEndMonoEnergyLossPct20_120 > 28,
  ];

  const dynamicsSignals = [
    metrics.crestFactorDb < 4.0,
    metrics.lraLu < 2.0,
    metrics.transient.punch_index < 0.7,
    metrics.transient.transient_density_cv < 0.12,
  ];

  const loudnessDamage = countTrue(loudnessSignals) >= 2;
  const stereoDamage = countTrue(stereoSignals) >= 2;
  const dynamicsDamage = countTrue(dynamicsSignals) >= 2;

  const confirmedGroups = countTrue([
    loudnessDamage,
    stereoDamage,
    dynamicsDamage,
  ]);

  return confirmedGroups >= 2 ? "rejected" : "approved";
}
