import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Playlist, PlaylistTrack } from "@/types/database";
import PlaylistClient from "./PlaylistClient";
import PlaylistHeaderClient from "./PlaylistHeaderClient";

export default async function PlaylistPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createSupabaseServerClient();

  // Playlist laden
  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", params.id)
    .single<Playlist>();

  // Falls Playlist nicht existiert → 404
  if (!playlist) {
    return <div className="p-6 text-white">Playlist not found.</div>;
  }

  // Tracks laden (JOIN)
  const { data: playlistTracks } = await supabase
    .from("playlist_tracks")
    .select(`
      id,
      position,
      tracks (
        *,
        artist:profiles!tracks_artist_id_fkey (
          display_name
        )
      )
    `)
    .eq("playlist_id", params.id)
    .order("position", { ascending: true })
    .returns<PlaylistTrack[]>();

  return (
    <div className="p-2 sm:p-4 lg:p-6 text-white">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* PLAYLIST HEADER */}
        <PlaylistHeaderClient
          playlist={playlist}
          playlistTracks={playlistTracks ?? []}
        />

        <PlaylistClient
          playlist={playlist}
          playlistTracks={playlistTracks ?? []}
        />
      </div>
    </div>

  );
}
