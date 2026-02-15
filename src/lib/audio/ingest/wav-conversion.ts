import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function writeTempWav(params: { wavBuf: ArrayBuffer }): Promise<string> {
  const tmpWavPath = join(
    tmpdir(),
    `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`
  );

  await writeFile(tmpWavPath, Buffer.from(params.wavBuf));
  return tmpWavPath;
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
