export type PrivateMetricsMapped = {
  truePeakDb: number;
  integratedLufs: number;
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
  transient: {
    mean_short_rms_dbfs: number;
    p95_short_rms_dbfs: number;
    mean_short_peak_dbfs: number;
    p95_short_peak_dbfs: number;
    mean_short_crest_db: number;
    p95_short_crest_db: number;
    transient_density: number;
    punch_index: number;
  };
  lraLu: number;
  truePeakOvers: Array<{ t0: number; t1: number; peak_db_tp: number }>;
  truePeakOverEvents: Array<{ t0: number; t1: number; peak_db_tp: number; severity: "warn" | "critical" }>;
  truePeakDbEffective: number;
};

export function mapExtractToPrivateMetrics(extract: {
  ok: true;
  truePeakDb: number;
  integratedLufs: number;
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
  transient: PrivateMetricsMapped["transient"];
  lraLu: number;
  truePeakOvers: PrivateMetricsMapped["truePeakOvers"];
  truePeakOverEvents: PrivateMetricsMapped["truePeakOverEvents"];
  truePeakDbEffective: number;
}): PrivateMetricsMapped {
  return {
    truePeakDb: extract.truePeakDb,
    integratedLufs: extract.integratedLufs,
    maxSamplePeakDbfs: extract.maxSamplePeakDbfs,
    clippedSampleCount: extract.clippedSampleCount,
    crestFactorDb: extract.crestFactorDb,
    phaseCorrelation: extract.phaseCorrelation,
    midRmsDbfs: extract.midRmsDbfs,
    sideRmsDbfs: extract.sideRmsDbfs,
    midSideEnergyRatio: extract.midSideEnergyRatio,
    stereoWidthIndex: extract.stereoWidthIndex,
    lowEndPhaseCorrelation20_120: extract.lowEndPhaseCorrelation20_120,
    lowEndMonoEnergyLossPct20_120: extract.lowEndMonoEnergyLossPct20_120,
    spectralSubRmsDbfs: extract.spectralSubRmsDbfs,
    spectralLowRmsDbfs: extract.spectralLowRmsDbfs,
    spectralLowMidRmsDbfs: extract.spectralLowMidRmsDbfs,
    spectralMidRmsDbfs: extract.spectralMidRmsDbfs,
    spectralHighMidRmsDbfs: extract.spectralHighMidRmsDbfs,
    spectralHighRmsDbfs: extract.spectralHighRmsDbfs,
    spectralAirRmsDbfs: extract.spectralAirRmsDbfs,
    transient: extract.transient,
    lraLu: extract.lraLu,
    truePeakOvers: extract.truePeakOvers,
    truePeakOverEvents: extract.truePeakOverEvents,
    truePeakDbEffective: extract.truePeakDbEffective,
  };
}
