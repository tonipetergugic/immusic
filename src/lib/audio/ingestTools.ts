import {
  ffmpegDetectSilence,
  ffmpegDetectDcOffsetAbsMean,
  ffmpegDetectTruePeakDbTp,
  ffmpegDetectIntegratedLufs,
  ffmpegDetectMaxSamplePeakDbfs,
  ffmpegDetectRmsLevelDbfs,
  ffmpegDetectRmsDbfsWithPan,
  ffmpegDetectBandRmsDbfs,
  ffmpegDetectClippedSampleCount,
  ffmpegDetectTruePeakAndIntegratedLufs,
  ffmpegDetectLoudnessRangeLu,
  ffmpegDetectTruePeakOversEvents,
  type SilenceSegment,
  type TruePeakOverEvent,
} from "@/lib/audio/ingest/ffmpeg-stderr-analysis";
import {
  ffmpegDetectTruePeakOvers,
  ffmpegDetectPhaseCorrelation,
  ffmpegDetectTransientPunchMetrics,
  ffmpegDetectPhaseCorrelationEvents,
  type TruePeakOverWindow,
  type PhaseCorrEvent,
  type TransientPunchMetrics,
} from "@/lib/audio/ingest/pcm-stream-analysis";
import { ffprobeDurationSeconds } from "@/lib/audio/ingest/metadata";
import { writeTempWav, transcodeWavFileToMp3_320 } from "@/lib/audio/ingest/wav-conversion";

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
  ffmpegDetectClippedSampleCount,
  ffmpegDetectTruePeakAndIntegratedLufs,
  ffmpegDetectLoudnessRangeLu,
  ffmpegDetectTruePeakOversEvents,
};
export type { SilenceSegment, TruePeakOverEvent };

export {
  ffmpegDetectTruePeakOvers,
  ffmpegDetectPhaseCorrelation,
  ffmpegDetectTransientPunchMetrics,
  ffmpegDetectPhaseCorrelationEvents,
};
export type { TruePeakOverWindow, PhaseCorrEvent, TransientPunchMetrics };
