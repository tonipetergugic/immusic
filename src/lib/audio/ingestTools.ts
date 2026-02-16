import {
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
  ffmpegDetectTruePeakOvers,
  ffmpegDetectPhaseCorrelation,
  ffmpegDetectPhaseCorrelationBand,
  ffmpegDetectTransientPunchMetrics,
  ffmpegDetectPhaseCorrelationEvents,
  ffprobeDurationSeconds,
  writeTempWav,
  transcodeWavFileToMp3_320,
  type SilenceSegment,
  type TruePeakOverEvent,
  type TruePeakOverWindow,
  type PhaseCorrEvent,
  type TransientPunchMetrics,
} from "@/lib/audio/ingest";

export const MAX_TRACK_SECONDS = 10 * 60;

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function sha256HexFromArrayBuffer(buf: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return toHex(digest);
}

export { writeTempWav, transcodeWavFileToMp3_320 };
export { ffprobeDurationSeconds };

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
};
export type { SilenceSegment, TruePeakOverEvent };

export {
  ffmpegDetectTruePeakOvers,
  ffmpegDetectPhaseCorrelation,
  ffmpegDetectPhaseCorrelationBand,
  ffmpegDetectTransientPunchMetrics,
  ffmpegDetectPhaseCorrelationEvents,
};
export type { TruePeakOverWindow, PhaseCorrEvent, TransientPunchMetrics };
