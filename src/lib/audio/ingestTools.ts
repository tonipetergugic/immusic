import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

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

export async function writeTempWav(params: { wavBuf: ArrayBuffer }): Promise<string> {
  const tmpWavPath = join(
    tmpdir(),
    `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`
  );

  await writeFile(tmpWavPath, Buffer.from(params.wavBuf));
  return tmpWavPath;
}

export async function ffprobeDurationSeconds(params: { inPath: string }): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-i",
    params.inPath,
  ]);

  try {
    const json = JSON.parse(stdout || "{}");
    const durStr = json?.format?.duration;
    const dur = typeof durStr === "string" ? Number(durStr) : Number(durStr ?? NaN);
    return dur;
  } catch {
    return NaN;
  }
}

export type SilenceSegment = { start: number; end: number; dur: number };

export async function ffmpegDetectSilence(params: {
  inPath: string;
  noiseDb?: number;
  minSilenceSec?: number;
}): Promise<SilenceSegment[]> {
  const noiseDb = params.noiseDb ?? -50;
  const minSilenceSec = params.minSilenceSec ?? 0.5;

  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    `silencedetect=noise=${noiseDb}dB:d=${minSilenceSec}`,
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  const segs: SilenceSegment[] = [];
  let currentStart: number | null = null;

  const reStart = /silence_start:\s*([0-9.]+)/i;
  const reEnd = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/i;

  for (const line of lines) {
    const m1 = line.match(reStart);
    if (m1) {
      currentStart = Number(m1[1]);
      continue;
    }
    const m2 = line.match(reEnd);
    if (m2) {
      const end = Number(m2[1]);
      const dur = Number(m2[2]);
      const start = currentStart ?? (end - dur);
      segs.push({ start, end, dur });
      currentStart = null;
    }
  }

  return segs.filter(
    (s) =>
      Number.isFinite(s.start) &&
      Number.isFinite(s.end) &&
      Number.isFinite(s.dur) &&
      s.dur > 0
  );
}

export async function transcodeWavFileToMp3_320(params: {
  inPath: string;
}): Promise<{ mp3Bytes: Uint8Array; outPath: string }> {
  const outPath = join(
    tmpdir(),
    `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`
  );

  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    params.inPath,
    "-vn",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "320k",
    "-compression_level",
    "0",
    outPath,
  ]);

  const mp3 = await readFile(outPath);
  return { mp3Bytes: new Uint8Array(mp3), outPath };
}

export async function ffmpegDetectDcOffsetAbsMean(params: {
  inPath: string;
}): Promise<number> {
  // We parse ffmpeg astats output for "Mean" (per-channel). We take max(abs(meanL), abs(meanR)).
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "astats=metadata=1:reset=1",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  // Example line patterns vary; we match "Mean" values.
  // We'll take the largest absolute mean value found.
  let maxAbsMean = 0;

  const re = /Mean:\s*([-0-9.]+)/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    maxAbsMean = Math.max(maxAbsMean, Math.abs(v));
  }

  return maxAbsMean;
}

export async function ffmpegDetectTruePeakDbTp(params: {
  inPath: string;
}): Promise<number> {
  // ffmpeg ebur128 prints summary lines to stderr. We parse "Peak:" lines and take the max.
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "ebur128=peak=true",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  let maxPeak = Number.NEGATIVE_INFINITY;

  // Match e.g. "Peak:  +1.2 dBFS" (format differs by build; accept dB / dBFS)
  const re = /Peak:\s*([+-]?[0-9.]+)\s*dB/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    maxPeak = Math.max(maxPeak, v);
  }

  if (maxPeak === Number.NEGATIVE_INFINITY) return NaN;
  return maxPeak;
}

export async function ffmpegDetectIntegratedLufs(params: {
  inPath: string;
}): Promise<number> {
  // ebur128 prints a final summary with "I:  -XX.X LUFS" (format varies).
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "ebur128=peak=0",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  // We'll take the last seen "I:" value.
  let lastI = NaN;

  const re = /\bI:\s*([+-]?[0-9.]+)\s*LUFS\b/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    lastI = v;
  }

  return lastI;
}

export async function ffmpegDetectMaxSamplePeakDbfs(params: {
  inPath: string;
}): Promise<number> {
  // Sample peak (not true peak): parse ffmpeg astats "Peak level dB" and take the max (closest to 0).
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "astats=metadata=0:reset=0",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  let maxPeakDb = Number.NEGATIVE_INFINITY;

  // Typical line: "Peak level dB: -0.23" (may appear per channel)
  const re = /Peak\s*level\s*dB:\s*([+-]?[0-9.]+)/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    maxPeakDb = Math.max(maxPeakDb, v);
  }

  if (maxPeakDb === Number.NEGATIVE_INFINITY) return NaN;
  return maxPeakDb;
}

export async function ffmpegDetectRmsLevelDbfs(params: {
  inPath: string;
}): Promise<number> {
  // RMS level (dBFS): parse ffmpeg astats "RMS level dB" and take the max (closest to 0).
  // We intentionally use astats with reset=0 to consider the whole file.
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "astats=metadata=0:reset=0",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  let maxRmsDb = Number.NEGATIVE_INFINITY;

  // Typical line: "RMS level dB: -18.23" (may appear per channel)
  const re = /RMS\s*level\s*dB:\s*([+-]?[0-9.]+)/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    maxRmsDb = Math.max(maxRmsDb, v);
  }

  if (maxRmsDb === Number.NEGATIVE_INFINITY) return NaN;
  return maxRmsDb;
}

export async function ffmpegDetectClippedSampleCount(params: {
  inPath: string;
}): Promise<number> {
  // Count clipped samples (sample-level clipping) via ffmpeg astats.
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "astats=metadata=0:reset=0",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  // Typical astats line: "Number of clipped samples: 0"
  const re = /Number\s+of\s+clipped\s+samples:\s*([0-9]+)/i;

  let sum = 0;
  let foundAny = false;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    sum += v;
    foundAny = true;
  }

  // If the build doesn't emit the field, signal "unknown"
  if (!foundAny) return NaN;
  return sum;
}

export async function ffmpegDetectTruePeakAndIntegratedLufs(params: {
  inPath: string;
}): Promise<{ truePeakDbTp: number; integratedLufs: number }> {
  // Single ebur128 run: parse both True Peak and Integrated LUFS from stderr.
  // Use numeric peak option (peak=1) for broader ffmpeg build compatibility.
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "ebur128=peak=1",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  // True Peak: prefer "True peak:" lines, fallback to "Peak:" if build doesn't emit true peak
  let maxPeak = Number.NEGATIVE_INFINITY;
  const truePeakRe = /True\s*peak:\s*([+-]?[0-9.]+)\s*dB/i;
  const peakRe = /Peak:\s*([+-]?[0-9.]+)\s*dB/i;

  // Integrated LUFS: take last "I:" value
  let lastI = NaN;
  const iRe = /\bI:\s*([+-]?[0-9.]+)\s*LUFS\b/i;

  for (const line of lines) {
    const tpm = line.match(truePeakRe);
    if (tpm) {
      const v = Number(tpm[1]);
      if (Number.isFinite(v)) maxPeak = Math.max(maxPeak, v);
    } else {
      const pm = line.match(peakRe);
      if (pm) {
        const v = Number(pm[1]);
        if (Number.isFinite(v)) maxPeak = Math.max(maxPeak, v);
      }
    }

    const im = line.match(iRe);
    if (im) {
      const v = Number(im[1]);
      if (Number.isFinite(v)) lastI = v;
    }
  }

  // Fallback: Some ffmpeg builds don't emit ebur128 peak lines. If maxPeak is still unset, run astats to get peak level dB.
  if (maxPeak === Number.NEGATIVE_INFINITY) {
    const { stderr: astatsStderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "info",
      "-i",
      params.inPath,
      "-af",
      "astats=metadata=0:reset=0",
      "-f",
      "null",
      "-",
    ]);

    const astatsOut = String(astatsStderr || "");
    const astatsLines = astatsOut.split(/\r?\n/);

    // Typical line: "Peak level dB: -0.23"
    const peakLevelRe = /Peak\s*level\s*dB:\s*([+-]?[0-9.]+)/i;
    for (const line of astatsLines) {
      const m = line.match(peakLevelRe);
      if (m) {
        const v = Number(m[1]);
        if (Number.isFinite(v)) {
          maxPeak = v;
          break;
        }
      }
    }
  }

  return {
    truePeakDbTp: maxPeak === Number.NEGATIVE_INFINITY ? NaN : maxPeak,
    integratedLufs: lastI,
  };
}

