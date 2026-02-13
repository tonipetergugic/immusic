import { execFile, spawn } from "node:child_process";
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

export async function ffmpegDetectRmsDbfsWithPan(params: {
  inPath: string;
  panExpr: string; // e.g. "mono|c0=0.5*c0+0.5*c1"
}): Promise<number> {
  // Deterministic RMS detection after panning to mono.
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-vn",
    "-af",
    `pan=${params.panExpr},astats=metadata=0:reset=0`,
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  // Take the last seen "RMS level dB:" value.
  let last = NaN;
  const re = /RMS level dB:\s*([+-]?[0-9.]+)\b/i;

  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      const v = Number(m[1]);
      if (Number.isFinite(v)) last = v;
    }
  }

  return last;
}

export async function ffmpegDetectBandRmsDbfs(params: {
  inPath: string;
  fLowHz: number;
  fHighHz: number;
}): Promise<number> {
  const fLow = Number(params.fLowHz);
  const fHigh = Number(params.fHighHz);

  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow <= 0 || fHigh <= 0 || fHigh <= fLow) {
    return NaN;
  }

  // Band-limited RMS via ffmpeg filters + astats (whole file, reset=0).
  // Deterministic: parse last "RMS level dB:" value.
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-vn",
    "-af",
    `highpass=f=${fLow},lowpass=f=${fHigh},astats=metadata=0:reset=0`,
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  let last = NaN;
  const re = /RMS level dB:\s*([+-]?[0-9.]+)\b/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (Number.isFinite(v)) last = v;
  }

  return last;
}

export async function ffmpegDetectPhaseCorrelation(params: {
  inPath: string;
}): Promise<number> {
  // Pearson correlation coefficient between L and R channels over the whole file.
  // Range ~ [-1..+1]. +1 = mono/identical, <0 indicates anti-phase risk.
  // Deterministic, no UI leak: we only persist server-side.
  return await new Promise<number>((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      params.inPath,
      "-vn",
      "-ac",
      "2",
      "-ar",
      "11025",
      "-f",
      "f32le",
      "pipe:1",
    ]);

    let stderr = "";
    ff.stderr?.on("data", (d) => {
      stderr += String(d);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    // Streaming accumulation to avoid buffering whole PCM.
    let leftover: Buffer = Buffer.alloc(0);

    let n = 0; // sample frames
    let sumL = 0;
    let sumR = 0;
    let sumLL = 0;
    let sumRR = 0;
    let sumLR = 0;

    ff.stdout?.on("data", (chunk: Buffer) => {
      const buf = leftover.length ? Buffer.concat([leftover, chunk]) : chunk;
      const frameBytes = 8; // 2 * float32
      const frames = Math.floor(buf.length / frameBytes);

      for (let i = 0; i < frames; i++) {
        const off = i * frameBytes;
        const l = buf.readFloatLE(off);
        const r = buf.readFloatLE(off + 4);

        // Ignore non-finite values defensively
        if (!Number.isFinite(l) || !Number.isFinite(r)) continue;

        n++;
        sumL += l;
        sumR += r;
        sumLL += l * l;
        sumRR += r * r;
        sumLR += l * r;
      }

      const used = frames * frameBytes;
      leftover = used < buf.length ? Buffer.from(buf.subarray(used)) : Buffer.alloc(0);
    });

    ff.on("error", (err) => reject(err));

    ff.on("close", (code) => {
      if (code !== 0) {
        const e: any = new Error("ffmpeg_phase_correlation_failed");
        e.code = code;
        e.stderr = stderr;
        return reject(e);
      }

      if (n <= 0) return resolve(NaN);

      const num = n * sumLR - sumL * sumR;
      const denL = n * sumLL - sumL * sumL;
      const denR = n * sumRR - sumR * sumR;

      const den = Math.sqrt(denL * denR);
      if (!Number.isFinite(den) || den <= 0) return resolve(NaN);

      const corr = num / den;

      // Clamp to [-1, 1] to avoid tiny numeric overshoots
      const clamped = Math.max(-1, Math.min(1, corr));
      resolve(clamped);
    });
  });
}

export type PhaseCorrEvent = { t0: number; t1: number; corr: number; severity: "warn" | "critical" };

export type TransientPunchMetrics = {
  mean_short_rms_dbfs: number;
  p95_short_rms_dbfs: number;
  mean_short_peak_dbfs: number;
  p95_short_peak_dbfs: number;
  mean_short_crest_db: number;
  p95_short_crest_db: number;
  transient_density: number; // 0..1
  punch_index: number; // 0..100
};

export async function ffmpegDetectTransientPunchMetrics(params: {
  inPath: string;
  windowSec?: number; // default 0.02 (20ms)
  sampleRate?: number; // default 11025
}): Promise<TransientPunchMetrics> {
  const windowSec = params.windowSec ?? 0.02;
  const sampleRate = params.sampleRate ?? 11025;

  if (!Number.isFinite(windowSec) || windowSec <= 0) {
    return {
      mean_short_rms_dbfs: NaN,
      p95_short_rms_dbfs: NaN,
      mean_short_peak_dbfs: NaN,
      p95_short_peak_dbfs: NaN,
      mean_short_crest_db: NaN,
      p95_short_crest_db: NaN,
      transient_density: NaN,
      punch_index: NaN,
    };
  }

  return await new Promise<TransientPunchMetrics>((resolve, reject) => {
    const windowFrames = Math.max(1, Math.floor(windowSec * sampleRate));

    // Downmix to mono to be genre-agnostic and stable.
    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      params.inPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(sampleRate),
      "-f",
      "f32le",
      "pipe:1",
    ]);

    let stderr = "";
    ff.stderr?.on("data", (d) => {
      stderr += String(d);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    let leftover: Buffer = Buffer.alloc(0);

    // Window accumulators (non-overlapping windows: hop = window)
    let wN = 0;
    let sumSq = 0;
    let peakAbs = 0;

    const rmsDbArr: number[] = [];
    const peakDbArr: number[] = [];
    const crestArr: number[] = [];

    function finalizeWindow() {
      if (wN <= 0) return;

      const rms = Math.sqrt(sumSq / wN);
      const peak = peakAbs;

      // reset
      wN = 0;
      sumSq = 0;
      peakAbs = 0;

      const rmsDb = 20 * Math.log10(rms + 1e-12);
      const peakDb = 20 * Math.log10(peak + 1e-12);
      const crestDb = peakDb - rmsDb;

      if (Number.isFinite(rmsDb)) rmsDbArr.push(rmsDb);
      if (Number.isFinite(peakDb)) peakDbArr.push(peakDb);
      if (Number.isFinite(crestDb)) crestArr.push(crestDb);
    }

    ff.stdout?.on("data", (chunk: Buffer) => {
      const buf = leftover.length ? Buffer.concat([leftover, chunk]) : chunk;
      const sampleBytes = 4; // float32 mono
      const samples = Math.floor(buf.length / sampleBytes);

      for (let i = 0; i < samples; i++) {
        const off = i * sampleBytes;
        const v = buf.readFloatLE(off);
        if (!Number.isFinite(v)) continue;

        const a = Math.abs(v);
        wN++;
        sumSq += v * v;
        if (a > peakAbs) peakAbs = a;

        if (wN >= windowFrames) {
          finalizeWindow();
        }
      }

      const used = samples * sampleBytes;
      leftover = used < buf.length ? Buffer.from(buf.subarray(used)) : Buffer.alloc(0);
    });

    ff.on("error", (err) => reject(err));

    ff.on("close", (code) => {
      if (code !== 0) {
        const e: any = new Error("ffmpeg_transient_punch_failed");
        e.code = code;
        e.stderr = stderr;
        return reject(e);
      }

      // finalize trailing partial window
      finalizeWindow();

      if (crestArr.length === 0) {
        return resolve({
          mean_short_rms_dbfs: NaN,
          p95_short_rms_dbfs: NaN,
          mean_short_peak_dbfs: NaN,
          p95_short_peak_dbfs: NaN,
          mean_short_crest_db: NaN,
          p95_short_crest_db: NaN,
          transient_density: NaN,
          punch_index: NaN,
        });
      }

      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

      const p95 = (arr: number[]) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
        return sorted[idx];
      };

      const meanRms = rmsDbArr.length ? mean(rmsDbArr) : NaN;
      const p95Rms = rmsDbArr.length ? p95(rmsDbArr) : NaN;

      const meanPeak = peakDbArr.length ? mean(peakDbArr) : NaN;
      const p95Peak = peakDbArr.length ? p95(peakDbArr) : NaN;

      const meanCrest = mean(crestArr);
      const p95Crest = p95(crestArr);

      const transientCount = crestArr.filter((c) => c > meanCrest + 1.5).length;
      const transientDensity = transientCount / crestArr.length;

      const punchIndex = Math.max(0, Math.min(100, (p95Crest - 6) * 8));

      resolve({
        mean_short_rms_dbfs: meanRms,
        p95_short_rms_dbfs: p95Rms,
        mean_short_peak_dbfs: meanPeak,
        p95_short_peak_dbfs: p95Peak,
        mean_short_crest_db: meanCrest,
        p95_short_crest_db: p95Crest,
        transient_density: transientDensity,
        punch_index: punchIndex,
      });
    });
  });
}

export async function ffmpegDetectPhaseCorrelationEvents(params: {
  inPath: string;
  windowSec?: number; // default 0.5
}): Promise<PhaseCorrEvent[]> {
  const windowSec = params.windowSec ?? 0.5;

  return await new Promise<PhaseCorrEvent[]>((resolve, reject) => {
    const sampleRate = 11025;
    const windowFrames = Math.max(1, Math.floor(windowSec * sampleRate));

    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      params.inPath,
      "-vn",
      "-ac",
      "2",
      "-ar",
      String(sampleRate),
      "-f",
      "f32le",
      "pipe:1",
    ]);

    let stderr = "";
    ff.stderr?.on("data", (d) => {
      stderr += String(d);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    let leftover: Buffer = Buffer.alloc(0);

    // Window accumulators
    let wN = 0;
    let sumL = 0;
    let sumR = 0;
    let sumLL = 0;
    let sumRR = 0;
    let sumLR = 0;

    let globalFrameIndex = 0; // counts valid frames consumed (including non-finite? we skip non-finite)
    let windowStartFrameIndex = 0;

    const events: PhaseCorrEvent[] = [];

    function finalizeWindow(t0: number, t1: number) {
      if (wN <= 0) return;

      const num = wN * sumLR - sumL * sumR;
      const denL = wN * sumLL - sumL * sumL;
      const denR = wN * sumRR - sumR * sumR;
      const den = Math.sqrt(denL * denR);

      // reset window
      wN = 0;
      sumL = 0;
      sumR = 0;
      sumLL = 0;
      sumRR = 0;
      sumLR = 0;

      if (!Number.isFinite(den) || den <= 0) return;

      const corr = Math.max(-1, Math.min(1, num / den));

      if (corr < -0.2) {
        events.push({ t0, t1, corr, severity: "critical" });
      } else if (corr < 0) {
        events.push({ t0, t1, corr, severity: "warn" });
      }
    }

    ff.stdout?.on("data", (chunk: Buffer) => {
      const buf = leftover.length ? Buffer.concat([leftover, chunk]) : chunk;
      const frameBytes = 8; // 2 * float32
      const frames = Math.floor(buf.length / frameBytes);

      for (let i = 0; i < frames; i++) {
        const off = i * frameBytes;
        const l = buf.readFloatLE(off);
        const r = buf.readFloatLE(off + 4);

        if (!Number.isFinite(l) || !Number.isFinite(r)) continue;

        wN++;
        sumL += l;
        sumR += r;
        sumLL += l * l;
        sumRR += r * r;
        sumLR += l * r;

        globalFrameIndex++;

        if (globalFrameIndex - windowStartFrameIndex >= windowFrames) {
          const t0 = windowStartFrameIndex / sampleRate;
          const t1 = globalFrameIndex / sampleRate;
          finalizeWindow(t0, t1);
          windowStartFrameIndex = globalFrameIndex;
        }
      }

      const used = frames * frameBytes;
      leftover = used < buf.length ? Buffer.from(buf.subarray(used)) : Buffer.alloc(0);
    });

    ff.on("error", (err) => reject(err));

    ff.on("close", (code) => {
      if (code !== 0) {
        const e: any = new Error("ffmpeg_phase_correlation_events_failed");
        e.code = code;
        e.stderr = stderr;
        return reject(e);
      }

      // finalize trailing partial window
      if (globalFrameIndex > windowStartFrameIndex) {
        const t0 = windowStartFrameIndex / sampleRate;
        const t1 = globalFrameIndex / sampleRate;
        finalizeWindow(t0, t1);
      }

      // Merge adjacent same-severity events if they touch (small cleanup)
      const merged: PhaseCorrEvent[] = [];
      for (const ev of events) {
        const last = merged[merged.length - 1];
        if (
          last &&
          last.severity === ev.severity &&
          Math.abs(last.t1 - ev.t0) < 1e-6
        ) {
          // extend, keep worst corr (more negative)
          last.t1 = ev.t1;
          last.corr = Math.min(last.corr, ev.corr);
        } else {
          merged.push({ ...ev });
        }
      }

      resolve(merged);
    });
  });
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

export async function ffmpegDetectLoudnessRangeLu(params: {
  inPath: string;
}): Promise<number> {
  // EBU R128 Loudness Range (LRA) in LU, parsed from ffmpeg ebur128 summary.
  // Deterministic, whole-file.
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

  // Typical summary line contains: "LRA:  7.2 LU"
  // We take the last seen LRA value.
  let lastLra = NaN;
  const re = /\bLRA:\s*([+-]?[0-9.]+)\s*LU\b/i;

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    if (Number.isFinite(v)) lastLra = v;
  }

  return lastLra;
}
