import { PlayerTrack } from "@/types/playerTrack";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function getReleaseCoverPublicUrl(path?: string | null): string | null {
  if (!supabase || !path) {
    return null;
  }
  return supabase.storage.from("release_covers").getPublicUrl(path).data.publicUrl;
}

type ProfileLike = {
  display_name?: string | null;
};

type ProfileSource = ProfileLike | ProfileLike[] | null | undefined;

type TrackLike = {
  id: string;
  title?: string | null;
  artist_id?: string | null;
  cover_url?: string | null;
  releases?: {
    cover_path?: string | null;
  } | null;
  audio_url?: string | null;
  audio_path?: string | null;
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
  const releaseCoverUrl = getReleaseCoverPublicUrl(track.releases?.cover_path);
  const audioPublicUrl =
    track.audio_url ||
    (track.audio_path
      ? supabase?.storage.from("tracks").getPublicUrl(track.audio_path).data.publicUrl
      : "") ||
    "";

  return {
    id: track.id,
    title: track.title ?? "Untitled Track",
    artist_id: track.artist_id ?? "",
    cover_url: releaseCoverUrl ?? track.cover_url ?? null,
    audio_url: audioPublicUrl,
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

