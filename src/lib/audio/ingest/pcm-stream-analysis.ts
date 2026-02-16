import { spawn } from "node:child_process";

// --- True Peak Overs (timecoded) ---
// We approximate true peak via high-rate resampling (ffmpeg resampler) and peak detection per window.
// Output values are in dBFS but treated as dBTP-approx for encoding headroom.
export type TruePeakOverWindow = { t0: number; t1: number; peak_db_tp: number };

export async function ffmpegDetectTruePeakOvers(params: {
  inPath: string;
  windowSec?: number; // default 0.1s
  sampleRate?: number; // default 192000 (oversampled)
}): Promise<TruePeakOverWindow[]> {
  const windowSec = params.windowSec ?? 0.1;
  const sampleRate = params.sampleRate ?? 192000;

  if (!Number.isFinite(windowSec) || windowSec <= 0) return [];
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) return [];

  return await new Promise<TruePeakOverWindow[]>((resolve, reject) => {
    const windowFrames = Math.max(1, Math.floor(windowSec * sampleRate));

    // Decode + resample up to high SR, keep stereo, output float32 PCM to pipe.
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

    let globalFrameIndex = 0;
    let windowStartFrameIndex = 0;

    let peakAbs = 0;

    const overs: TruePeakOverWindow[] = [];

    function finalizeWindow(t0: number, t1: number) {
      const peakDb = 20 * Math.log10(peakAbs + 1e-12);
      // reset window peak
      peakAbs = 0;

      if (!Number.isFinite(peakDb)) return;

      // Only emit "overs" above 0.0 dBTP threshold (hard-fail gate)
      if (peakDb > 0.0) {
        overs.push({ t0, t1, peak_db_tp: peakDb });
      }
    }

    ff.stdout?.on("data", (chunk: Buffer) => {
      const buf = leftover.length ? Buffer.concat([leftover, chunk]) : chunk;
      const frameBytes = 8; // 2 * float32 (stereo)
      const frames = Math.floor(buf.length / frameBytes);

      for (let i = 0; i < frames; i++) {
        const off = i * frameBytes;
        const l = buf.readFloatLE(off);
        const r = buf.readFloatLE(off + 4);

        if (!Number.isFinite(l) || !Number.isFinite(r)) continue;

        const a = Math.max(Math.abs(l), Math.abs(r));
        if (a > peakAbs) peakAbs = a;

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
        const e: any = new Error("ffmpeg_true_peak_overs_failed");
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

      // Merge adjacent windows that touch (cleanup)
      const merged: TruePeakOverWindow[] = [];
      for (const ev of overs) {
        const last = merged[merged.length - 1];
        if (last && Math.abs(last.t1 - ev.t0) < 1e-6) {
          last.t1 = ev.t1;
          last.peak_db_tp = Math.max(last.peak_db_tp, ev.peak_db_tp);
        } else {
          merged.push({ ...ev });
        }
      }

      resolve(merged);
    });
  });
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

export async function ffmpegDetectPhaseCorrelationBand(params: {
  inPath: string;
  fLowHz: number;
  fHighHz: number;
}): Promise<number> {
  const fLow = Number(params.fLowHz);
  const fHigh = Number(params.fHighHz);

  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow <= 0 || fHigh <= 0 || fHigh <= fLow) {
    return NaN;
  }

  // Pearson correlation coefficient between L and R channels, but only within a frequency band.
  // Deterministic, whole-file streaming PCM.
  return await new Promise<number>((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      params.inPath,
      "-vn",
      "-af",
      `highpass=f=${fLow},lowpass=f=${fHigh}`,
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

    let leftover: Buffer = Buffer.alloc(0);

    let n = 0;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumYY = 0;
    let sumXY = 0;

    ff.stdout?.on("data", (chunk: Buffer) => {
      const buf = leftover.length ? Buffer.concat([leftover, chunk]) : chunk;
      const frameBytes = 8; // 2 * float32 (stereo)
      const frames = Math.floor(buf.length / frameBytes);

      for (let i = 0; i < frames; i++) {
        const off = i * frameBytes;
        const x = buf.readFloatLE(off);
        const y = buf.readFloatLE(off + 4);

        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

        n++;
        sumX += x;
        sumY += y;
        sumXX += x * x;
        sumYY += y * y;
        sumXY += x * y;
      }

      leftover = buf.slice(frames * frameBytes);
    });

    ff.on("error", reject);

    ff.on("close", (code) => {
      if (code !== 0) {
        // Avoid leaking details; only NaN on failure
        return resolve(NaN);
      }

      if (n < 10) return resolve(NaN);

      const meanX = sumX / n;
      const meanY = sumY / n;

      const cov = sumXY / n - meanX * meanY;
      const varX = sumXX / n - meanX * meanX;
      const varY = sumYY / n - meanY * meanY;

      const den = Math.sqrt(Math.max(0, varX * varY)) + 1e-12;
      if (!Number.isFinite(den) || den <= 0) return resolve(NaN);

      const corr = cov / den;
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
