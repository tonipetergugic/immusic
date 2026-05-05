import type {
  ArtistDecisionPayload,
  CriticalWarning,
  TechnicalReleaseCheck,
} from "@/components/decision-center/types";

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function buildDecisionPayloadFromArtistFeedbackPayload(
  artistFeedbackPayload: unknown
): ArtistDecisionPayload | null {
  const root = asRecord(artistFeedbackPayload);
  const track = asRecord(root.track);
  const release = asRecord(root.release);
  const meta = asRecord(root.meta);

  if (!Object.keys(track).length || !Object.keys(release).length) {
    return null;
  }

  return {
    track: {
      title:
        asString(track.title) ??
        asString(track.filename) ??
        "Untitled track",
      artist_name: null,
      version: null,
      duration_sec: asNumber(track.duration_sec) ?? asNumber(track.duration) ?? 0,
      declared_bpm: null,
      declared_key: null,
      main_genre: null,
      subgenre: null,
      artwork_url: null,
    },
    track_status: asRecord(release.track_status),
    release_readiness: asRecord(release.release_readiness),
    critical_warnings: asArray<CriticalWarning>(release.critical_warnings),
    technical_release_checks: asArray<TechnicalReleaseCheck>(
      release.technical_release_checks
    ),
    key_strengths: [],
    things_to_check: [],
    next_step: asRecord(release.next_step),
    optional_feedback: {
      available: true,
      locked: true,
      label: "AI Consultant & detailed feedback",
      text: "Optional premium feedback can explain the track check in more detail.",
    },
    meta: {
      warnings: asArray<string>(meta.warnings),
      source: asString(meta.source) ?? "analysis_engine",
      created_at: asString(meta.created_at),
    },
  };
}
