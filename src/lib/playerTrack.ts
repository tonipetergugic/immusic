import { PlayerTrack } from "@/types/playerTrack";

type ProfileLike = {
  display_name?: string | null;
};

type ProfileSource = ProfileLike | ProfileLike[] | null | undefined;

type TrackLike = {
  id: string;
  title?: string | null;
  artist_id?: string | null;
  cover_url?: string | null;
  audio_url?: string | null;
  bpm?: number | null;
  key?: string | null;
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
    throw new Error("Cannot convert track without an id");
  }

  const profileSource =
    normalizeProfile(track.profiles) ??
    normalizeProfile(track.artist) ??
    normalizeProfile(track.artist_profile) ??
    null;

  return {
    id: track.id,
    title: track.title ?? "Untitled Track",
    artist_id: track.artist_id ?? "",
    cover_url: track.cover_url ?? null,
    audio_url: track.audio_url ?? "",
    bpm: track.bpm ?? null,
    key: track.key ?? null,
    profiles: profileSource
      ? {
          display_name: profileSource.display_name ?? null,
        }
      : undefined,
  };
}

export function toPlayerTrackList(tracks: TrackLike[] | null | undefined): PlayerTrack[] {
  if (!tracks) return [];
  return tracks.map((track) => toPlayerTrack(track));
}

