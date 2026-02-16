import {
  ffmpegDetectTruePeakAndIntegratedLufs,
  ffmpegDetectMaxSamplePeakDbfs,
  ffmpegDetectClippedSampleCount,
  ffmpegDetectRmsLevelDbfs,
  ffmpegDetectPhaseCorrelation,
  ffmpegDetectPhaseCorrelationBand,
  ffmpegDetectRmsDbfsWithPan,
  ffmpegDetectBandRmsDbfs,
  ffmpegDetectBandRmsDbfsWithPan,
  ffmpegDetectTransientPunchMetrics,
  ffmpegDetectLoudnessRangeLu,
  ffmpegDetectTruePeakOvers,
  ffmpegDetectTruePeakOversEvents,
  type TransientPunchMetrics,
} from "@/lib/audio/ingestTools";
import { ffmpegDetectShortTermLufsTimeline } from "@/lib/audio/ingest/ffmpeg-stderr-analysis";
import { AI_DEBUG } from "@/lib/ai/track-check/debug";

type ExtractOk = {
  ok: true;
  truePeakDb: number;
  integratedLufs: number;
  maxSamplePeakDbfs: number;
  clippedSampleCount: number;
  crestFactorDb: number;
  phaseCorrelation: number;
  lowEndPhaseCorrelation20_120: number;
  lowEndMonoEnergyLossPct20_120: number;
  midRmsDbfs: number;
  sideRmsDbfs: number;
  midSideEnergyRatio: number;
  stereoWidthIndex: number;
  spectralSubRmsDbfs: number;
  spectralLowRmsDbfs: number;
  spectralLowMidRmsDbfs: number;
  spectralMidRmsDbfs: number;
  spectralHighMidRmsDbfs: number;
  spectralHighRmsDbfs: number;
  spectralAirRmsDbfs: number;
  lraLu: number;
  truePeakOvers: Array<{ t0: number; t1: number; peak_db_tp: number }>;
  truePeakOverEvents: Array<{ t0: number; t1: number; peak_db_tp: number; severity: "warn" | "critical" }>;
  truePeakDbEffective: number;
  transient: TransientPunchMetrics;
  shortTermLufsTimeline: Array<{ t: number; lufs: number }>;
};

type ExtractErr = {
  ok: false;
  error: "ebur128_detect_failed";
  err: any;
};

export async function extractPrivateMetricsFromTmpWav(params: {
  tmpWavPath: string;
  logStage: (stage: string, ms: number) => void;
  nowNs: () => bigint;
  elapsedMs: (startNs: bigint) => number;
}): Promise<ExtractOk | ExtractErr> {
  let truePeakDb: number;
  let integratedLufs: number;
  let maxSamplePeakDbfs: number;
  let clippedSampleCount: number;
  let crestFactorDb: number = NaN;
  let phaseCorrelation: number;
  let lowEndPhaseCorrelation20_120: number = NaN;
  let lowEndMonoEnergyLossPct20_120: number = NaN;
  let midRmsDbfs: number = NaN;
  let sideRmsDbfs: number = NaN;
  let midSideEnergyRatio: number = NaN;
  let stereoWidthIndex: number = NaN;
  let spectralSubRmsDbfs: number = NaN;
  let spectralLowRmsDbfs: number = NaN;
  let spectralLowMidRmsDbfs: number = NaN;
  let spectralMidRmsDbfs: number = NaN;
  let spectralHighMidRmsDbfs: number = NaN;
  let spectralHighRmsDbfs: number = NaN;
  let spectralAirRmsDbfs: number = NaN;
  let lraLu: number = NaN;
  let truePeakOvers: Array<{ t0: number; t1: number; peak_db_tp: number }> = [];
  let truePeakOverEvents: Array<{ t0: number; t1: number; peak_db_tp: number; severity: "warn" | "critical" }> = [];
  let truePeakDbEffective: number = NaN;
  let shortTermLufsTimeline: Array<{ t: number; lufs: number }> = [];
  let transient: TransientPunchMetrics = {
    mean_short_rms_dbfs: NaN,
    p95_short_rms_dbfs: NaN,
    mean_short_peak_dbfs: NaN,
    p95_short_peak_dbfs: NaN,
    mean_short_crest_db: NaN,
    p95_short_crest_db: NaN,
    transient_density: NaN,
    punch_index: NaN,
  };

  try {
    const tEbur = params.nowNs();
    const r = await ffmpegDetectTruePeakAndIntegratedLufs({ inPath: params.tmpWavPath });
    params.logStage("detect_true_peak_lufs", params.elapsedMs(tEbur));
    truePeakDb = r.truePeakDbTp;
    integratedLufs = r.integratedLufs;
    // Short-term (or momentary fallback) LUFS timeline via ebur128 framelog
    shortTermLufsTimeline = await ffmpegDetectShortTermLufsTimeline({ inPath: params.tmpWavPath, maxPoints: 1200 });
    maxSamplePeakDbfs = await ffmpegDetectMaxSamplePeakDbfs({ inPath: params.tmpWavPath });
    const clippedSampleCountRaw = await ffmpegDetectClippedSampleCount({ inPath: params.tmpWavPath });
    clippedSampleCount =
      Number.isFinite(clippedSampleCountRaw) && clippedSampleCountRaw >= 0
        ? Math.trunc(clippedSampleCountRaw)
        : 0;

    const rmsDbfs = await ffmpegDetectRmsLevelDbfs({ inPath: params.tmpWavPath });
    crestFactorDb =
      Number.isFinite(truePeakDb) && Number.isFinite(rmsDbfs) ? truePeakDb - rmsDbfs : NaN;

    const phaseCorrelationRaw = await ffmpegDetectPhaseCorrelation({ inPath: params.tmpWavPath });
    phaseCorrelation = phaseCorrelationRaw;

    // Low-End Mono Stability (20–120 Hz) - purely technical, deterministic
    lowEndPhaseCorrelation20_120 = await ffmpegDetectPhaseCorrelationBand({
      inPath: params.tmpWavPath,
      fLowHz: 20,
      fHighHz: 120,
    });

    const lowMidDbfs_20_120 = await ffmpegDetectBandRmsDbfsWithPan({
      inPath: params.tmpWavPath,
      fLowHz: 20,
      fHighHz: 120,
      panExpr: "mono|c0=0.5*c0+0.5*c1",
    });

    const lowLDbfs_20_120 = await ffmpegDetectBandRmsDbfsWithPan({
      inPath: params.tmpWavPath,
      fLowHz: 20,
      fHighHz: 120,
      panExpr: "mono|c0=c0",
    });

    const lowRDbfs_20_120 = await ffmpegDetectBandRmsDbfsWithPan({
      inPath: params.tmpWavPath,
      fLowHz: 20,
      fHighHz: 120,
      panExpr: "mono|c0=c1",
    });

    const midLin_20_120 = Number.isFinite(lowMidDbfs_20_120) ? Math.pow(10, lowMidDbfs_20_120 / 20) : NaN;
    const lLin_20_120 = Number.isFinite(lowLDbfs_20_120) ? Math.pow(10, lowLDbfs_20_120 / 20) : NaN;
    const rLin_20_120 = Number.isFinite(lowRDbfs_20_120) ? Math.pow(10, lowRDbfs_20_120 / 20) : NaN;

    const monoEnergy_20_120 = Number.isFinite(midLin_20_120) ? midLin_20_120 * midLin_20_120 : NaN;
    const stereoEnergy_20_120 =
      Number.isFinite(lLin_20_120) && Number.isFinite(rLin_20_120)
        ? 0.5 * ((lLin_20_120 * lLin_20_120) + (rLin_20_120 * rLin_20_120))
        : NaN;

    if (Number.isFinite(monoEnergy_20_120) && Number.isFinite(stereoEnergy_20_120) && stereoEnergy_20_120 > 0) {
      const loss = 1 - monoEnergy_20_120 / (stereoEnergy_20_120 + 1e-12);
      const clamped = Math.max(0, Math.min(1, loss));
      lowEndMonoEnergyLossPct20_120 = clamped * 100;
    } else {
      lowEndMonoEnergyLossPct20_120 = NaN;
    }

    midRmsDbfs = await ffmpegDetectRmsDbfsWithPan({
      inPath: params.tmpWavPath,
      panExpr: "mono|c0=0.5*c0+0.5*c1",
    });

    sideRmsDbfs = await ffmpegDetectRmsDbfsWithPan({
      inPath: params.tmpWavPath,
      panExpr: "mono|c0=0.5*c0-0.5*c1",
    });

    // Energy ratio based on linear RMS (not dB): side_energy / mid_energy
    const midLin = Number.isFinite(midRmsDbfs) ? Math.pow(10, midRmsDbfs / 20) : NaN;
    const sideLin = Number.isFinite(sideRmsDbfs) ? Math.pow(10, sideRmsDbfs / 20) : NaN;

    midSideEnergyRatio =
      Number.isFinite(midLin) && Number.isFinite(sideLin) && midLin > 0
        ? (sideLin * sideLin) / (midLin * midLin)
        : NaN;

    // Stereo width index: normalized side vs total energy [0..1]
    stereoWidthIndex =
      Number.isFinite(midLin) && Number.isFinite(sideLin) && midLin >= 0 && sideLin >= 0
        ? (sideLin * sideLin) / ((midLin * midLin) + (sideLin * sideLin) + 1e-12)
        : NaN;

    // Spectral band RMS (dBFS) - genre-agnostic, deterministic
    spectralSubRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: params.tmpWavPath, fLowHz: 20, fHighHz: 60 });
    spectralLowRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: params.tmpWavPath, fLowHz: 60, fHighHz: 200 });
    spectralLowMidRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: params.tmpWavPath, fLowHz: 200, fHighHz: 500 });
    spectralMidRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: params.tmpWavPath, fLowHz: 500, fHighHz: 2000 });
    spectralHighMidRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: params.tmpWavPath, fLowHz: 2000, fHighHz: 6000 });
    spectralHighRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: params.tmpWavPath, fLowHz: 6000, fHighHz: 12000 });
    spectralAirRmsDbfs = await ffmpegDetectBandRmsDbfs({ inPath: params.tmpWavPath, fLowHz: 12000, fHighHz: 16000 });

    transient = await ffmpegDetectTransientPunchMetrics({ inPath: params.tmpWavPath });

    lraLu = await ffmpegDetectLoudnessRangeLu({ inPath: params.tmpWavPath });

    // Timecoded True Peak Overs (windowed, oversampled SR)
    truePeakOvers = await ffmpegDetectTruePeakOvers({ inPath: params.tmpWavPath });

    truePeakOverEvents = await ffmpegDetectTruePeakOversEvents({ inPath: params.tmpWavPath, thresholdDbTp: 0.0 });

    // Compute effective True Peak from both the measured true peak and any detected overs events.
    // IMPORTANT: must match the persisted DB shape: { t0, t1, peak_db_tp }
    const maxOverDbTp =
      Array.isArray(truePeakOverEvents)
        ? truePeakOverEvents.reduce((acc: number, ev: any) => {
            const v = Number(ev?.peak_db_tp);
            return Number.isFinite(v) ? Math.max(acc, v) : acc;
          }, -Infinity)
        : -Infinity;

    truePeakDbEffective =
      Number.isFinite(maxOverDbTp) ? Math.max(truePeakDb, maxOverDbTp) : truePeakDb;

    if (AI_DEBUG) {
      console.log("[AI-CHECK] LUFS:", integratedLufs);
      console.log("[AI-CHECK] TruePeak:", truePeakDb);
      console.log("[AI-CHECK] LRA (LU):", lraLu);
    }
    if (process.env.AI_DEBUG === "1") {
      console.log("[AI-CHECK] RMS dBFS:", rmsDbfs);
      console.log("[AI-CHECK] Crest dB:", crestFactorDb);

      console.log("[AI-CHECK] PhaseCorr:", phaseCorrelation);
      console.log("[AI-CHECK] Mid RMS dBFS:", midRmsDbfs);
      console.log("[AI-CHECK] Side RMS dBFS:", sideRmsDbfs);
      console.log("[AI-CHECK] Mid/Side Energy Ratio:", midSideEnergyRatio);
      console.log("[AI-CHECK] Stereo Width Index:", stereoWidthIndex);
    }

    return {
      ok: true,
      truePeakDb,
      integratedLufs,
      maxSamplePeakDbfs,
      clippedSampleCount,
      crestFactorDb,
      phaseCorrelation,
      lowEndPhaseCorrelation20_120,
      lowEndMonoEnergyLossPct20_120,
      midRmsDbfs,
      sideRmsDbfs,
      midSideEnergyRatio,
      stereoWidthIndex,
      spectralSubRmsDbfs,
      spectralLowRmsDbfs,
      spectralLowMidRmsDbfs,
      spectralMidRmsDbfs,
      spectralHighMidRmsDbfs,
      spectralHighRmsDbfs,
      spectralAirRmsDbfs,
      lraLu,
      truePeakOvers,
      truePeakOverEvents,
      truePeakDbEffective,
      transient,
      shortTermLufsTimeline,
    };
  } catch (err: any) {
    return { ok: false, error: "ebur128_detect_failed", err };
  }
}
