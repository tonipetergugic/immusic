export { ffprobeDurationSeconds } from "@/lib/audio/ingest/metadata";

export { writeTempWav, transcodeWavFileToMp3_320 } from "@/lib/audio/ingest/wav-conversion";

export {
  ffmpegDetectTruePeakOvers,
  ffmpegDetectPhaseCorrelation,
  ffmpegDetectPhaseCorrelationBand,
  ffmpegDetectTransientPunchMetrics,
  ffmpegDetectPhaseCorrelationEvents,
} from "@/lib/audio/ingest/pcm-stream-analysis";

export type {
  TruePeakOverWindow,
  PhaseCorrEvent,
  TransientPunchMetrics,
} from "@/lib/audio/ingest/pcm-stream-analysis";

export {
  ffmpegDetectSilence,
  ffmpegDetectDcOffsetAbsMean,
  ffmpegDetectTruePeakDbTp,
  ffmpegDetectIntegratedLufs,
  ffmpegDetectMaxSamplePeakDbfs,
  ffmpegDetectRmsLevelDbfs,
  ffmpegDetectRmsDbfsWithPan,
  ffmpegDetectBandRmsDbfs,
  ffmpegDetectBandRmsDbfsWithPan,
  ffmpegDetectClippedSampleCount,
  ffmpegDetectTruePeakAndIntegratedLufs,
  ffmpegDetectLoudnessRangeLu,
  ffmpegDetectTruePeakOversEvents,
} from "@/lib/audio/ingest/ffmpeg-stderr-analysis";

export type {
  SilenceSegment,
  TruePeakOverEvent,
} from "@/lib/audio/ingest/ffmpeg-stderr-analysis";
