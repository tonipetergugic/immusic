import { PlayerTrack } from "@/types/playerTrack";

type ProfileLike = {
  display_name?: string | null;
};

type ProfileSource = ProfileLike | ProfileLike[] | null | undefined;

type TrackLike = {
  id: string;
  title?: string | null;
  version?: string | null;
  artist_id?: string | null;
  audio_url: string;            // MUSS serverseitig gesetzt sein
  cover_url?: string | null;    // darf null sein
  bpm?: number | null;
  key?: string | null;
  genre?: string | null;
  profiles?: ProfileSource;
  artist?: ProfileSource;
  artist_profile?: ProfileSource;
};

function normalizeProfile(profile?: ProfileSource): ProfileLike | null {
  if (!profile) return null;
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }
  return profile;
}

export function toPlayerTrack(track: TrackLike | null | undefined): PlayerTrack {
  if (!track?.id) {
    throw new Error("toPlayerTrack: missing track.id");
  }

  if (!track.audio_url) {
    throw new Error(
      `toPlayerTrack: missing audio_url for track ${track.id} (server bug)`
    );
  }

  const profileSource =
    normalizeProfile(track.artist_profile) ??
    normalizeProfile(track.profiles) ??
    normalizeProfile(track.artist) ??
    null;

  const resultVersion = (track as any).version ?? null;

  return {
    id: track.id,
    title: track.title ?? "Untitled Track",
    version: resultVersion,
    artist_id: track.artist_id ?? "",
    audio_url: track.audio_url,
    cover_url: track.cover_url ?? null,
    bpm: track.bpm ?? null,
    key: track.key ?? null,
    genre: track.genre ?? null,
    profiles: profileSource
      ? {
          display_name: profileSource.display_name ?? null,
        }
      : undefined,
  };
}

export function toPlayerTrackList(
  tracks: TrackLike[] | null | undefined
): PlayerTrack[] {
  if (!tracks) return [];
  return tracks.map((track) => toPlayerTrack(track));
}
