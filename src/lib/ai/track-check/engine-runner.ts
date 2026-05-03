import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { basename, join, parse } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type AnalysisEngineRunnerSuccess = {
  ok: true;
  artistFeedbackPayload: Record<string, unknown>;
  outputDir: string;
  artistFeedbackPayloadPath: string;
  stdout: string;
  stderr: string;
};

export type AnalysisEngineRunnerFailure = {
  ok: false;
  errorCode:
    | "missing_audio_path"
    | "engine_failed"
    | "artist_feedback_payload_missing"
    | "artist_feedback_payload_invalid";
  message: string;
  stdout?: string;
  stderr?: string;
};

export type AnalysisEngineRunnerResult =
  | AnalysisEngineRunnerSuccess
  | AnalysisEngineRunnerFailure;

export async function runAnalysisEngineForAudio(params: {
  audioPath: string;
  trackId?: string | null;
  timeoutMs?: number;
}): Promise<AnalysisEngineRunnerResult> {
  const audioPath = params.audioPath?.trim();

  if (!audioPath) {
    return {
      ok: false,
      errorCode: "missing_audio_path",
      message: "Missing audio path for analysis_engine.",
    };
  }

  const pythonBin = process.env.IMMUSIC_PYTHON_BIN || "python3";
  const trackStem = parse(audioPath).name;
  const outputDir = join(process.cwd(), "analysis_engine", "output", trackStem);
  const artistFeedbackPayloadPath = join(outputDir, "artist_feedback_payload.json");

  const args = ["-m", "analysis_engine.main", audioPath];

  if (params.trackId) {
    args.push("--track-id", params.trackId);
  }

  let stdout = "";
  let stderr = "";

  try {
    const result = await execFileAsync(pythonBin, args, {
      cwd: process.cwd(),
      timeout: params.timeoutMs ?? 10 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });

    stdout = result.stdout ?? "";
    stderr = result.stderr ?? "";
  } catch (error) {
    const err = error as {
      message?: string;
      stdout?: string;
      stderr?: string;
    };

    return {
      ok: false,
      errorCode: "engine_failed",
      message: err.message ?? "analysis_engine failed.",
      stdout: err.stdout ?? stdout,
      stderr: err.stderr ?? stderr,
    };
  }

  try {
    await access(artistFeedbackPayloadPath);
  } catch {
    return {
      ok: false,
      errorCode: "artist_feedback_payload_missing",
      message: `analysis_engine did not write ${basename(artistFeedbackPayloadPath)}.`,
      stdout,
      stderr,
    };
  }

  try {
    const raw = await readFile(artistFeedbackPayloadPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        errorCode: "artist_feedback_payload_invalid",
        message: "artist_feedback_payload.json is not a JSON object.",
        stdout,
        stderr,
      };
    }

    return {
      ok: true,
      artistFeedbackPayload: parsed as Record<string, unknown>,
      outputDir,
      artistFeedbackPayloadPath,
      stdout,
      stderr,
    };
  } catch {
    return {
      ok: false,
      errorCode: "artist_feedback_payload_invalid",
      message: "artist_feedback_payload.json could not be parsed.",
      stdout,
      stderr,
    };
  }
}
