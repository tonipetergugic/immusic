const fs = require("node:fs");
const path = require("node:path");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

const isLinux = process.platform === "linux";
const isDarwin = process.platform === "darwin";

const resolvedFfmpegPath =
  typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic?.path ?? null;

const resolvedFfprobePath =
  typeof ffprobeStatic === "string" ? ffprobeStatic : ffprobeStatic?.path ?? null;

// Vercel/Linux: traced package path is unreliable, but node_modules path exists.
// Local macOS: use system binaries from PATH instead of linux package binaries.
const linuxNodeModulesFfmpegPath = path.join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg");
const linuxNodeModulesFfprobePath = path.join(
  process.cwd(),
  "node_modules/ffprobe-static/bin/linux/x64/ffprobe"
);

const finalFfmpegPath = isDarwin
  ? "ffmpeg"
  : resolvedFfmpegPath && fs.existsSync(resolvedFfmpegPath)
    ? resolvedFfmpegPath
    : isLinux && fs.existsSync(linuxNodeModulesFfmpegPath)
      ? linuxNodeModulesFfmpegPath
      : null;

const finalFfprobePath = isDarwin
  ? "ffprobe"
  : resolvedFfprobePath && fs.existsSync(resolvedFfprobePath)
    ? resolvedFfprobePath
    : isLinux && fs.existsSync(linuxNodeModulesFfprobePath)
      ? linuxNodeModulesFfprobePath
      : null;

if (!finalFfmpegPath) {
  throw new Error("Missing ffmpeg binary");
}

if (!finalFfprobePath) {
  throw new Error("Missing ffprobe binary");
}

export const ffmpegPath = finalFfmpegPath;
export const ffprobePath = finalFfprobePath;
