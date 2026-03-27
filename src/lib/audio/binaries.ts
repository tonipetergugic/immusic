const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

const resolvedFfmpegPath =
  typeof ffmpegStatic === "string" ? ffmpegStatic : ffmpegStatic?.path ?? null;

const resolvedFfprobePath =
  typeof ffprobeStatic === "string" ? ffprobeStatic : ffprobeStatic?.path ?? null;

if (!resolvedFfmpegPath) {
  throw new Error("Missing ffmpeg-static binary");
}

if (!resolvedFfprobePath) {
  throw new Error("Missing ffprobe-static binary");
}

export const ffmpegPath = resolvedFfmpegPath;
export const ffprobePath = resolvedFfprobePath;
