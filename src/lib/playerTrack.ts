import { PlayerTrack } from "@/types/playerTrack";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    id: string;
    cover_path: string | null;
    status: string;
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
    normalizeProfile(track.artist_profile) ??
    normalizeProfile(track.profiles) ??
    normalizeProfile(track.artist) ??
    null;

  const coverUrl =
    track.releases?.cover_path && supabase
      ? supabase.storage
          .from("release_covers")
          .getPublicUrl(track.releases.cover_path).data.publicUrl
      : null;

  let audioPublicUrl = track.audio_url ?? "";

  if (!audioPublicUrl && track.audio_path && supabase) {
    const { data } = supabase.storage.from("tracks").getPublicUrl(track.audio_path);
    audioPublicUrl = data.publicUrl ?? "";
  }

  return {
    id: track.id,
    title: track.title ?? "Untitled Track",
    artist_id: track.artist_id ?? "",
    cover_url: coverUrl,
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
