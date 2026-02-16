import { persistPrivateMetricsAndEvents } from "@/lib/ai/track-check/private-persistence";
import type { TransientPunchMetrics } from "@/lib/audio/ingestTools";

export async function persistExtractedMetricsOrFail(params: {
  admin: any;
  queueId: string;
  title: string | null;
  durationSec: number;
  integratedLufs: number;
  truePeakDbEffective: number;
  lraLu: number;
  maxSamplePeakDbfs: number;
  clippedSampleCount: number;
  crestFactorDb: number;
  phaseCorrelation: number;
  midRmsDbfs: number;
  sideRmsDbfs: number;
  midSideEnergyRatio: number;
  stereoWidthIndex: number;
  lowEndPhaseCorrelation20_120: number;
  lowEndMonoEnergyLossPct20_120: number;
  spectralSubRmsDbfs: number;
  spectralLowRmsDbfs: number;
  spectralLowMidRmsDbfs: number;
  spectralMidRmsDbfs: number;
  spectralHighMidRmsDbfs: number;
  spectralHighRmsDbfs: number;
  spectralAirRmsDbfs: number;
  transient: TransientPunchMetrics;
  truePeakOvers: Array<{ t0: number; t1: number; peak_db_tp: number }>;
  truePeakOverEvents: Array<{ t0: number; t1: number; peak_db_tp: number; severity: "warn" | "critical" }>;
  truePeakDb: number;
  shortTermLufsTimeline?: Array<{ t: number; lufs: number }>;
}) {
  return await persistPrivateMetricsAndEvents({
    admin: params.admin,
    queueId: params.queueId,
    title: params.title,
    durationSec: params.durationSec,
    integratedLufs: params.integratedLufs,
    truePeakDbEffective: params.truePeakDbEffective,
    lraLu: params.lraLu,
    maxSamplePeakDbfs: params.maxSamplePeakDbfs,
    clippedSampleCount: params.clippedSampleCount,
    crestFactorDb: params.crestFactorDb,
    phaseCorrelation: params.phaseCorrelation,
    midRmsDbfs: params.midRmsDbfs,
    sideRmsDbfs: params.sideRmsDbfs,
    midSideEnergyRatio: params.midSideEnergyRatio,
    stereoWidthIndex: params.stereoWidthIndex,
    lowEndPhaseCorrelation20_120: params.lowEndPhaseCorrelation20_120,
    lowEndMonoEnergyLossPct20_120: params.lowEndMonoEnergyLossPct20_120,
    spectralSubRmsDbfs: params.spectralSubRmsDbfs,
    spectralLowRmsDbfs: params.spectralLowRmsDbfs,
    spectralLowMidRmsDbfs: params.spectralLowMidRmsDbfs,
    spectralMidRmsDbfs: params.spectralMidRmsDbfs,
    spectralHighMidRmsDbfs: params.spectralHighMidRmsDbfs,
    spectralHighRmsDbfs: params.spectralHighRmsDbfs,
    spectralAirRmsDbfs: params.spectralAirRmsDbfs,
    transient: params.transient,
    truePeakOvers: params.truePeakOvers,
    truePeakOverEvents: params.truePeakOverEvents,
    truePeakDb: params.truePeakDb,
    shortTermLufsTimeline: params.shortTermLufsTimeline,
  });
}
