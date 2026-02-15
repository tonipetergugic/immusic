import { collectHardFailReasonsV2, type HardFailReason } from "@/lib/ai/track-check/rules";

export function collectHardFailReasonsFromMetrics(params: {
  truePeakDbEffective: number;
  integratedLufs: number;
  lraLu: number;
  clippedSampleCount: number;
  crestFactorDb: number;
}): HardFailReason[] {
  return collectHardFailReasonsV2({
    truePeakDbEffective: params.truePeakDbEffective,
    integratedLufs: params.integratedLufs,
    lraLu: params.lraLu,
    clippedSampleCount: params.clippedSampleCount,
    crestFactorDb: params.crestFactorDb,
  });
}
