import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Playlist, PlaylistTrack } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";
import { toPlayerTrack } from "@/lib/playerTrack";

import PlaylistHeaderClient from "./PlaylistHeaderClient";
import PlaylistClient from "./PlaylistClient";

export default async function PlaylistPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Playlist laden
  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", id)
    .single<Playlist>();

  if (!playlist) {
    return <div className="p-6 text-white">Playlist not found.</div>;
  }

  // Playlist-Tracks laden
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
    .eq("playlist_id", id)
    .order("position", { ascending: true })
    .returns<PlaylistTrack[]>();

  const convertedTracks: PlayerTrack[] =
    playlistTracks?.map((pt) => toPlayerTrack(pt.tracks)) ?? [];

  return (
    <div className="flex w-full">  
      {/* Linker Bereich */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-2 max-w-[1600px] mx-auto">

        {/* Header (scrollt mit der Seite) */}
        <div className="mb-8">
          <PlaylistHeaderClient
            playlist={playlist}
            playerTracks={convertedTracks}
          />
        </div>

        {/* Trackliste scrollt NICHT separat → gehört zum globalen Scroll */}
        <div>
          <PlaylistClient
            playlist={playlist}
            playlistTracks={playlistTracks ?? []}
            initialPlayerTracks={convertedTracks}
          />
        </div>

      </div>
    </div>
  );
}
