import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ffprobePath } from "@/lib/audio/binaries";

const execFileAsync = promisify(execFile);

export async function ffprobeDurationSeconds(params: { inPath: string }): Promise<number> {
  const { stdout } = await execFileAsync(ffprobePath, [
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
