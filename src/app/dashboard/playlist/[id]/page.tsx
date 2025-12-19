export const dynamic = "force-dynamic";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Playlist, PlaylistTrack } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";
import { toPlayerTrack } from "@/lib/playerTrack";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!playlist) {
    return <div className="p-6 text-white">Playlist not found.</div>;
  }

  // Playlist-Tracks laden
  const { data: playlistTracks } = await supabase
    .from("playlist_tracks")
    .select(
      `
      id,
      position,
      tracks:tracks!playlist_tracks_track_id_fkey (
        *,
        releases:releases!tracks_release_id_fkey (
          status,
          cover_path
        ),
        artist:profiles!tracks_artist_id_fkey (
          display_name
        ),
        release_tracks:release_tracks!release_tracks_track_id_fkey (
          id,
          release_id,
          rating_avg,
          rating_count
        )
      )
    `
    )
    .eq("playlist_id", id)
    .order("position", { ascending: true })
    .returns<PlaylistTrack[]>();

  const convertedTracks: PlayerTrack[] =
    (playlistTracks ?? []).map((pt) => {
      const t = pt.tracks as any;
      const rtVal = t?.release_tracks;

      const rtArray = Array.isArray(rtVal) ? rtVal : rtVal ? [rtVal] : [];

      const matched =
        rtArray.find((rt: any) => rt.release_id === t.release_id) ??
        rtArray[0] ??
        null;

      const releaseTrackId = matched?.id ?? null;
      const rating_avg = matched?.rating_avg ?? null;
      const rating_count = matched?.rating_count ?? 0;

      const playerTrack = toPlayerTrack(pt.tracks);
      return {
        ...playerTrack,
        release_track_id: releaseTrackId,
        rating_avg,
        rating_count,
      };
    });

  const releaseTrackIds = convertedTracks
    .map((t) => t.release_track_id)
    .filter(Boolean) as string[];

  let finalTracks = convertedTracks;

  if (user && releaseTrackIds.length > 0) {
    const { data: myRatings, error: myRatingsError } = await supabase
      .from("track_ratings")
      .select("release_track_id, stars")
      .eq("user_id", user.id)
      .in("release_track_id", releaseTrackIds);

    if (myRatingsError) {
      console.error("Failed to load user ratings", myRatingsError);
    } else {
      const myRatingMap = new Map(
        myRatings?.map((r) => [r.release_track_id, r.stars]) ?? []
      );

      finalTracks = convertedTracks.map((t) => ({
        ...t,
        my_stars: t.release_track_id
          ? myRatingMap.get(t.release_track_id) ?? null
          : null,
      }));
    }
  }

  return (
    <div className="flex w-full">  
      {/* Linker Bereich */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-2 max-w-[1500px] mx-auto">

        {/* Trackliste scrollt NICHT separat → gehört zum globalen Scroll */}
        <div>
          <PlaylistClient
            playlist={playlist}
            playlistTracks={playlistTracks ?? []}
            initialPlayerTracks={finalTracks}
            user={user}
          />
        </div>

      </div>
    </div>
  );
}
