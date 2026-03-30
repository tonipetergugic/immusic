import type { SupabaseClient } from "@supabase/supabase-js";
import type { Playlist, Profile } from "@/types/database";
import { buildPlaylistCoverUrlServer } from "@/lib/playlistCovers.server";

type LibraryPlaylistRow = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_by: string | null;
  created_at: string;
  is_public: boolean;
};

export async function loadLibraryV2Playlists({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<Playlist[]> {
  const { data: ownPlaylists, error: ownErr } = await supabase
    .from("playlists")
    .select("id")
    .eq("created_by", userId);

  if (ownErr) console.error("LibraryV2: Failed to load own playlists:", ownErr);

  const { data: savedPlaylists, error: savedErr } = await supabase
    .from("library_playlists")
    .select("playlist_id")
    .eq("user_id", userId);

  if (savedErr) console.error("LibraryV2: Failed to load saved playlists:", savedErr);

  const playlistIds = Array.from(
    new Set([...(ownPlaylists ?? []).map((p) => p.id), ...(savedPlaylists ?? []).map((p) => p.playlist_id)])
  );

  if (playlistIds.length === 0) return [];

  const { data: playlistsData, error } = await supabase
    .from("playlists")
    .select("*")
    .in("id", playlistIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LibraryV2: Failed to load playlists:", error);
    return [];
  }

  const normalizedPlaylists: Playlist[] = ((playlistsData ?? []) as LibraryPlaylistRow[]).map(
    (playlist) => ({
      ...playlist,
      cover_url: buildPlaylistCoverUrlServer({
        supabase,
        cover_path: playlist.cover_url ?? null,
      }),
    })
  );

  return normalizedPlaylists;
}

type LibraryArtistSavedRow = {
  artist_id: string | null;
};

export async function loadLibraryV2Artists({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<Profile[]> {
  const { data: rows, error } = await supabase
    .from("library_artists")
    .select("artist_id")
    .eq("user_id", userId);

  if (error) {
    console.error("LibraryV2: Failed to load library_artists:", error);
    return [];
  }

  const artistIds = Array.from(
    new Set(
      ((rows ?? []) as LibraryArtistSavedRow[])
        .map((row) => row.artist_id)
        .filter((artistId): artistId is string => Boolean(artistId))
    )
  );

  if (artistIds.length === 0) return [];

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", artistIds)
    .order("created_at", { ascending: false });

  if (pErr) {
    console.error("LibraryV2: Failed to load profiles:", pErr);
    return [];
  }

  const normalizedProfiles: Profile[] = profiles ?? [];
  return normalizedProfiles;
}
