import path from "node:path";
import { access, readdir, readFile } from "node:fs/promises";
import type {
  AnalysisPayload,
  ArtistDecisionPayload,
} from "@/components/decision-center/types";

const ARTIST_DECISION_PAYLOAD_FILE = "artist_decision_payload.json";
const ANALYSIS_FILE = "analysis.json";
const WAVEFORM_FILE = "waveform.png";
const AI_CONSULTANT_SUMMARY_FILE = "ai_consultant_summary.md";

export type FeedbackLabTrackItem = {
  folderName: string;
  title: string;
  artistName: string | null;
};

export type FeedbackPageTrackData = {
  folderName: string;
  payloadPath: string;
  analysisPath: string;
  waveformPath: string;
  waveformSrc: string;
  waveformAvailable: boolean;
  consultantSummaryText: string | null;
  payload: ArtistDecisionPayload;
  analysis: AnalysisPayload | null;
};

export type LocalFeedbackPageData = {
  outputRoot: string;
  requestedTrackFolderName: string | null;
  items: FeedbackLabTrackItem[];
  selectedTrack: FeedbackPageTrackData | null;
};

function getOutputRoot() {
  return path.join(process.cwd(), "analysis_engine", "output");
}

function buildAssetUrl(folderName: string, fileName: string) {
  return `/decision-center-lab/assets?track=${encodeURIComponent(
    folderName,
  )}&file=${encodeURIComponent(fileName)}`;
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function readOptionalTextFile(filePath: string): Promise<string | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

async function readTrackFolder(
  outputRoot: string,
  folderName: string,
): Promise<FeedbackPageTrackData | null> {
  const payloadPath = path.join(
    outputRoot,
    folderName,
    ARTIST_DECISION_PAYLOAD_FILE,
  );
  const analysisPath = path.join(outputRoot, folderName, ANALYSIS_FILE);
  const waveformPath = path.join(outputRoot, folderName, WAVEFORM_FILE);
  const consultantSummaryPath = path.join(
    outputRoot,
    folderName,
    AI_CONSULTANT_SUMMARY_FILE,
  );

  try {
    const payload = await readJsonFile<ArtistDecisionPayload>(payloadPath);

    let analysis: AnalysisPayload | null = null;
    try {
      analysis = await readJsonFile<AnalysisPayload>(analysisPath);
    } catch {
      analysis = null;
    }

    return {
      folderName,
      payloadPath,
      analysisPath,
      waveformPath,
      waveformSrc: buildAssetUrl(folderName, WAVEFORM_FILE),
      waveformAvailable: await fileExists(waveformPath),
      consultantSummaryText: await readOptionalTextFile(consultantSummaryPath),
      payload,
      analysis,
    };
  } catch {
    return null;
  }
}

export async function readLocalFeedbackPageData(
  trackFolderName?: string | null,
): Promise<LocalFeedbackPageData> {
  const outputRoot = getOutputRoot();
  const requestedTrackFolderName = trackFolderName?.trim() || null;

  let entries;
  try {
    entries = await readdir(outputRoot, { withFileTypes: true });
  } catch {
    return {
      outputRoot,
      requestedTrackFolderName,
      items: [],
      selectedTrack: null,
    };
  }

  const folderNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const tracks = (
    await Promise.all(
      folderNames.map((folderName) => readTrackFolder(outputRoot, folderName)),
    )
  ).filter((track): track is FeedbackPageTrackData => Boolean(track));

  const selectedTrack =
    tracks.find((track) => track.folderName === requestedTrackFolderName) ||
    tracks[0] ||
    null;

  return {
    outputRoot,
    requestedTrackFolderName,
    items: tracks.map((track) => ({
      folderName: track.folderName,
      title: track.payload.track?.title || track.folderName,
      artistName: track.payload.track?.artist_name || null,
    })),
    selectedTrack,
  };
}
