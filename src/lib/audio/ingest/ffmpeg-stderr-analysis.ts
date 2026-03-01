import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

export async function ffmpegDetectBandRmsDbfsWithPan(params: {
  inPath: string;
  fLowHz: number;
  fHighHz: number;
  panExpr: string; // e.g. "mono|c0=0.5*c0+0.5*c1"
}): Promise<number> {
  const fLow = Number(params.fLowHz);
  const fHigh = Number(params.fHighHz);

  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow <= 0 || fHigh <= 0 || fHigh <= fLow) {
    return NaN;
  }

  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-vn",
    "-af",
    `highpass=f=${fLow},lowpass=f=${fHigh},pan=${params.panExpr},astats=metadata=0:reset=0`,
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  let last = NaN;
  const re = /RMS level dB:\s*([+-]?[0-9.]+)\b/i;

  for (const line of lines) {
    const m = re.exec(line);
    if (!m) continue;
    const v = Number(m[1]);
    if (Number.isFinite(v)) last = v;
  }

  return last;
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
  // loudnorm analysis prints JSON with input_i (LUFS) + input_tp (dBTP) for deterministic True Peak + Integrated LUFS
  const { stderr } = await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    params.inPath,
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
    "-f",
    "null",
    "-",
  ]);

  const out = String(stderr || "");
  const start = out.lastIndexOf("{");
  const end = out.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { truePeakDbTp: NaN, integratedLufs: NaN };
  }

  let json: any = null;
  try {
    json = JSON.parse(out.slice(start, end + 1));
  } catch {
    return { truePeakDbTp: NaN, integratedLufs: NaN };
  }

  const tp = Number(json?.input_tp);
  const i = Number(json?.input_i);

  return {
    truePeakDbTp: Number.isFinite(tp) ? tp : NaN,
    integratedLufs: Number.isFinite(i) ? i : NaN,
  };
}

export async function ffmpegDetectLoudnessRangeLu(params: {
  inPath: string;
}): Promise<number> {
  // EBU R128 Loudness Range (LRA) in LU, parsed from ffmpeg ebur128 summary.
  // Deterministic, whole-file.
  let stderr: string = "";
  try {
    ({ stderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "info",
      "-i",
      params.inPath,
      "-af",
      "ebur128=peak=2",
      "-f",
      "null",
      "-",
    ]));
  } catch {
    ({ stderr } = await execFileAsync("ffmpeg", [
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
    ]));
  }

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

export type TruePeakOverEvent = {
  t0: number;
  t1: number;
  peak_db_tp: number;
  severity: "warn" | "critical";
};

export type ShortTermLufsPoint = {
  t: number;     // seconds
  lufs: number;  // LUFS (short-term if available, otherwise momentary fallback)
};

export async function ffmpegDetectShortTermLufsTimeline(params: {
  inPath: string;
  maxPoints?: number; // default 1200
}): Promise<ShortTermLufsPoint[]> {
  const maxPoints = typeof params.maxPoints === "number" && Number.isFinite(params.maxPoints) ? Math.max(50, Math.trunc(params.maxPoints)) : 1200;

  let stderr: string = "";
  try {
    ({ stderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "verbose",
      "-i",
      params.inPath,
      "-af",
      "ebur128=peak=2:framelog=verbose",
      "-f",
      "null",
      "-",
    ]));
  } catch {
    ({ stderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "verbose",
      "-i",
      params.inPath,
      "-af",
      "ebur128=peak=1:framelog=verbose",
      "-f",
      "null",
      "-",
    ]));
  }

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  if (process.env.NODE_ENV !== "production") {
    // Useful debug when regex doesn't match the local ffmpeg framelog format
    const sample = lines
      .filter((l) => /t:\s*[0-9.]+/i.test(l) || /\b(?:M:|S:|I:|TP|True\s*peak|Peak)\b/i.test(l))
      .slice(0, 40);
    void sample; // reserved for optional debug
  }

  const reT = /\bt:\s*([0-9.]+)\b/i;

  // Accept "S:" / "M:" numbers with or without "LUFS"/"LU" suffix (builds vary)
  const reS = /\bS:\s*([+-]?[0-9.]+)\b(?:\s*(?:LUFS|LU))?\b/i;
  const reM = /\bM:\s*([+-]?[0-9.]+)\b(?:\s*(?:LUFS|LU))?\b/i;

  const points: ShortTermLufsPoint[] = [];

  for (const line of lines) {
    const mt = line.match(reT);
    if (!mt) continue;
    const t = Number(mt[1]);
    if (!Number.isFinite(t) || t < 0) continue;

    const ms = line.match(reS);
    const mm = line.match(reM);

    const raw = ms ? Number(ms[1]) : mm ? Number(mm[1]) : NaN;
    if (!Number.isFinite(raw)) continue;

    // Filter out "no signal" / gating sentinel values (ffmpeg often prints ~-120.7)
    if (raw <= -70) continue;

    // Clamp to a sane loudness range for UI + robustness
    const lufs = Math.max(-70, Math.min(0, raw));

    // Optional: drop exact duplicates to reduce payload noise
    const prev = points.length > 0 ? points[points.length - 1] : null;
    if (prev && Math.abs(prev.lufs - lufs) < 1e-9) {
      // keep time progression but avoid duplicate loudness values
      continue;
    }

    points.push({ t, lufs });
  }

  if (points.length === 0) {
    return [];
  }

  // Sort by time (defensive)
  points.sort((a, b) => a.t - b.t);

  // Downsample to maxPoints (uniform pick)
  if (points.length > maxPoints) {
    const step = points.length / maxPoints;
    const slim: ShortTermLufsPoint[] = [];
    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.min(points.length - 1, Math.floor(i * step));
      slim.push(points[idx]);
    }
    return slim;
  }

  return points;
}

export async function ffmpegDetectTruePeakOversEvents(params: {
  inPath: string;
  thresholdDbTp?: number; // default 0.0
}): Promise<TruePeakOverEvent[]> {
  const threshold = typeof params.thresholdDbTp === "number" ? params.thresholdDbTp : 0.0;

  // Use ebur128 frame logging; parse time + peak-ish fields defensively.
  // We treat any peak > threshold as an over-segment.
  let stderr: string = "";
  try {
    ({ stderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "info",
      "-i",
      params.inPath,
      "-af",
      "ebur128=peak=2:framelog=verbose",
      "-f",
      "null",
      "-",
    ]));
  } catch {
    ({ stderr } = await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "info",
      "-i",
      params.inPath,
      "-af",
      "ebur128=peak=1:framelog=verbose",
      "-f",
      "null",
      "-",
    ]));
  }

  const out = String(stderr || "");
  const lines = out.split(/\r?\n/);

  // We try to detect per-frame entries:
  // - time: "t: 12.34" (common in ebur128 framelog output)
  // - peak field: could be "TP:", "True peak:", "Peak:" depending on build
  const reT = /\bt:\s*([0-9.]+)\b/i;
  const rePeak = /\b(?:TP|True\s*peak|Peak)\s*:\s*([+-]?[0-9.]+)\s*dB\b/i;

  type Frame = { t: number; peak: number };
  const frames: Frame[] = [];

  for (const line of lines) {
    const mt = line.match(reT);
    if (!mt) continue;

    const t = Number(mt[1]);
    if (!Number.isFinite(t) || t < 0) continue;

    const mp = line.match(rePeak);
    if (!mp) continue;

    const peak = Number(mp[1]);
    if (!Number.isFinite(peak)) continue;

    frames.push({ t, peak });
  }

  if (frames.length === 0) return [];

  // Sort by time (defensive)
  frames.sort((a, b) => a.t - b.t);

  // Build contiguous segments where peak > threshold.
  // We assume frames are roughly ordered; we merge touching/near-touching frames.
  const events: TruePeakOverEvent[] = [];
  let cur: TruePeakOverEvent | null = null;

  const mergeGap = 0.25; // seconds; merge small gaps in framelog timing

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const isOver = f.peak > threshold;

    if (!isOver) {
      if (cur) {
        // close segment at this frame time
        cur.t1 = Math.max(cur.t1, f.t);
        events.push(cur);
        cur = null;
      }
      continue;
    }

    const sev: "warn" | "critical" = f.peak > 0.5 ? "critical" : "warn";

    if (!cur) {
      cur = { t0: f.t, t1: f.t, peak_db_tp: f.peak, severity: sev };
      continue;
    }

    // Extend or split depending on gap
    if (f.t - cur.t1 <= mergeGap) {
      cur.t1 = f.t;
      if (f.peak > cur.peak_db_tp) cur.peak_db_tp = f.peak;
      // escalate severity if needed
      if (sev === "critical") cur.severity = "critical";
    } else {
      events.push(cur);
      cur = { t0: f.t, t1: f.t, peak_db_tp: f.peak, severity: sev };
    }
  }

  if (cur) events.push(cur);

  // Ensure minimum segment length (optional): if t0==t1, extend by a tiny epsilon
  for (const ev of events) {
    if (ev.t1 <= ev.t0) ev.t1 = ev.t0 + 0.05;
  }

  return events;
}
