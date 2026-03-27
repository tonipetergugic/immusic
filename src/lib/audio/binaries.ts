const fs = require("node:fs");
const path = require("node:path");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

const resolvedFfmpegPath =
  typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic?.path ?? null;

const resolvedFfprobePath =
  typeof ffprobeStatic === "string" ? ffprobeStatic : ffprobeStatic?.path ?? null;

const cwdFfmpegPath = path.join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg");
const cwdFfprobePath = path.join(process.cwd(), "node_modules/ffprobe-static/bin/linux/x64/ffprobe");

console.error("binary resolution debug", {
  processCwd: process.cwd(),
  resolvedFfmpegPath,
  resolvedFfprobePath,
  cwdFfmpegPath,
  cwdFfprobePath,
  resolvedFfmpegExists: resolvedFfmpegPath ? fs.existsSync(resolvedFfmpegPath) : false,
  resolvedFfprobeExists: resolvedFfprobePath ? fs.existsSync(resolvedFfprobePath) : false,
  cwdFfmpegExists: fs.existsSync(cwdFfmpegPath),
  cwdFfprobeExists: fs.existsSync(cwdFfprobePath),
});

if (!resolvedFfmpegPath) {
  throw new Error("Missing ffmpeg-static binary");
}

if (!resolvedFfprobePath) {
  throw new Error("Missing ffprobe-static binary");
}

export const ffmpegPath = resolvedFfmpegPath;
export const ffprobePath = resolvedFfprobePath;
