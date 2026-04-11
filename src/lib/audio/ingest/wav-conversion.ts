import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ffmpegPath } from "@/lib/audio/binaries";

const execFileAsync = promisify(execFile);

export async function writeTempWav(params: { wavBuf: ArrayBuffer }): Promise<string> {
  const tmpWavPath = join(
    tmpdir(),
    `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`
  );

  await writeFile(tmpWavPath, Buffer.from(params.wavBuf));
  return tmpWavPath;
}

export async function transcodeWavFileToFlac(params: {
  inPath: string;
}): Promise<{ flacBytes: Uint8Array; outPath: string }> {
  const outPath = join(
    tmpdir(),
    `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.flac`
  );

  await execFileAsync(ffmpegPath, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    params.inPath,
    "-vn",
    "-codec:a",
    "flac",
    outPath,
  ]);

  const flac = await readFile(outPath);
  return { flacBytes: new Uint8Array(flac), outPath };
}

export async function transcodeWavFileToAac_160(params: {
  inPath: string;
}): Promise<{ aacBytes: Uint8Array; outPath: string }> {
  const outPath = join(
    tmpdir(),
    `immusic-${Date.now()}-${Math.random().toString(16).slice(2)}.m4a`
  );

  await execFileAsync(ffmpegPath, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    params.inPath,
    "-vn",
    "-codec:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    outPath,
  ]);

  const aac = await readFile(outPath);
  return { aacBytes: new Uint8Array(aac), outPath };
}
