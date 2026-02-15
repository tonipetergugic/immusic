import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { extractPrivateMetricsFromTmpWav } from "@/lib/ai/track-check/feature-extraction";
import { mapExtractToPrivateMetrics } from "@/lib/ai/track-check/metrics-mapping";

const execFileAsync = promisify(execFile);

export type DistortionRisk = "low" | "moderate" | "high";

export type CodecSimOne = {
  postTruePeakDb: number;
  oversCount: number;
  headroomDeltaDb: number;
  distortionRisk: DistortionRisk;
};

export type CodecSimulationResult = {
  aac128: CodecSimOne;
  mp3128: CodecSimOne;
};

function oversCountFromMapped(mapped: any): number {
  if (Array.isArray(mapped?.truePeakOvers)) return mapped.truePeakOvers.length;
  if (typeof mapped?.truePeakOvers === "number") return mapped.truePeakOvers;
  return 0;
}

function riskFromPostPeakAndOvers(params: { postTruePeakDb: number; oversCount: number }): DistortionRisk {
  const { postTruePeakDb, oversCount } = params;

  // Deterministisch, rein technisch:
  // - > +1.0 dBTP gilt als klar hohes Risiko
  // - > +0.3 dBTP oder viele Overs => moderat
  if (postTruePeakDb > 1.0) return "high";
  if (postTruePeakDb > 0.3) return "moderate";
  if (oversCount >= 5) return "moderate";
  return "low";
}

async function encodeMp3128ThenDecodeToWav(params: { inWavPath: string }): Promise<{ decodedWavPath: string; cleanup: () => Promise<void> }> {
  const { inWavPath } = params;

  const dir = await mkdtemp(path.join(os.tmpdir(), "immusic-codec-sim-"));
  const mp3Path = path.join(dir, "sim-128.mp3");
  const decodedWavPath = path.join(dir, "sim-128-decoded.wav");

  // Encode WAV -> MP3 128k (CBR)
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inWavPath,
    "-vn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    mp3Path,
  ]);

  // Decode MP3 -> WAV (PCM)
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    mp3Path,
    "-vn",
    "-c:a",
    "pcm_s16le",
    decodedWavPath,
  ]);

  async function cleanup() {
    // best-effort cleanup, ignore errors
    try { await unlink(mp3Path); } catch {}
    try { await unlink(decodedWavPath); } catch {}
    // directory cleanup is optional; leaving temp dir is acceptable in worst case
  }

  return { decodedWavPath, cleanup };
}

async function encodeAac128ThenDecodeToWav(params: { inWavPath: string }): Promise<{ decodedWavPath: string; cleanup: () => Promise<void> }> {
  const { inWavPath } = params;

  const dir = await mkdtemp(path.join(os.tmpdir(), "immusic-codec-sim-"));
  const aacPath = path.join(dir, "sim-128.m4a");
  const decodedWavPath = path.join(dir, "sim-128-decoded.wav");

  // Encode WAV -> AAC 128k (LC-AAC in M4A container)
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inWavPath,
    "-vn",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    aacPath,
  ]);

  // Decode AAC -> WAV (PCM)
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    aacPath,
    "-vn",
    "-c:a",
    "pcm_s16le",
    decodedWavPath,
  ]);

  async function cleanup() {
    try { await unlink(aacPath); } catch {}
    try { await unlink(decodedWavPath); } catch {}
  }

  return { decodedWavPath, cleanup };
}

export async function runCodecSimulationBestEffort(params: {
  tmpWavPath: string;
  preTruePeakDb: number;
  logStage: (stage: string, ms: number) => void;
  nowNs: () => bigint;
  elapsedMs: (startNs: bigint) => number;
}): Promise<CodecSimulationResult | null> {
  const { tmpWavPath, preTruePeakDb, logStage, nowNs, elapsedMs } = params;

  try {
    // AAC 128
    const tAacEncDec = nowNs();
    const aac = await encodeAac128ThenDecodeToWav({ inWavPath: tmpWavPath });
    logStage("codec_sim_aac128_encode_decode", elapsedMs(tAacEncDec));

    let aacOne: CodecSimOne | null = null;
    try {
      const tAacExtract = nowNs();
      const extractAac = await extractPrivateMetricsFromTmpWav({
        tmpWavPath: aac.decodedWavPath,
        logStage,
        nowNs,
        elapsedMs,
      });
      logStage("codec_sim_aac128_extract", elapsedMs(tAacExtract));

      if (extractAac.ok) {
        const mappedAac = mapExtractToPrivateMetrics(extractAac);
        const postTruePeakDb = (mappedAac as any).truePeakDbEffective;
        const oversCount = oversCountFromMapped(mappedAac);
        const headroomDeltaDb = postTruePeakDb - preTruePeakDb;

        aacOne = {
          postTruePeakDb,
          oversCount,
          headroomDeltaDb,
          distortionRisk: riskFromPostPeakAndOvers({ postTruePeakDb, oversCount }),
        };
      }
    } finally {
      await aac.cleanup();
    }

    // MP3 128
    const tMp3EncDec = nowNs();
    const mp3 = await encodeMp3128ThenDecodeToWav({ inWavPath: tmpWavPath });
    logStage("codec_sim_mp3128_encode_decode", elapsedMs(tMp3EncDec));

    let mp3One: CodecSimOne | null = null;
    try {
      const tMp3Extract = nowNs();
      const extractMp3 = await extractPrivateMetricsFromTmpWav({
        tmpWavPath: mp3.decodedWavPath,
        logStage,
        nowNs,
        elapsedMs,
      });
      logStage("codec_sim_mp3128_extract", elapsedMs(tMp3Extract));

      if (extractMp3.ok) {
        const mappedMp3 = mapExtractToPrivateMetrics(extractMp3);
        const postTruePeakDb = (mappedMp3 as any).truePeakDbEffective;
        const oversCount = oversCountFromMapped(mappedMp3);
        const headroomDeltaDb = postTruePeakDb - preTruePeakDb;

        mp3One = {
          postTruePeakDb,
          oversCount,
          headroomDeltaDb,
          distortionRisk: riskFromPostPeakAndOvers({ postTruePeakDb, oversCount }),
        };
      }
    } finally {
      await mp3.cleanup();
    }

    // If either branch failed, best-effort return null (no persistence)
    if (!aacOne || !mp3One) return null;

    return {
      aac128: aacOne,
      mp3128: mp3One,
    };
  } catch {
    // best-effort: never block the worker
    return null;
  }
}
