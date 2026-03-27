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

const finalFfmpegPath =
  resolvedFfmpegPath && fs.existsSync(resolvedFfmpegPath)
    ? resolvedFfmpegPath
    : fs.existsSync(cwdFfmpegPath)
      ? cwdFfmpegPath
      : null;

const finalFfprobePath =
  resolvedFfprobePath && fs.existsSync(resolvedFfprobePath)
    ? resolvedFfprobePath
    : fs.existsSync(cwdFfprobePath)
      ? cwdFfprobePath
      : null;

if (!finalFfmpegPath) {
  throw new Error("Missing ffmpeg binary");
}

if (!finalFfprobePath) {
  throw new Error("Missing ffprobe binary");
}

export const ffmpegPath = finalFfmpegPath;
export const ffprobePath = finalFfprobePath;
