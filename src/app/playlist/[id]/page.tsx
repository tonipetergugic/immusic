"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import TrackCard from "@/components/TrackCard";

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function loadPlaylist() {
      setLoading(true);

      // Playlist selbst laden
      const { data: playlistData } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .single();

      setPlaylist(playlistData);

      // Tracks dazu holen
      const { data: trackLinks } = await supabase
        .from("playlist_tracks")
        .select("track_id, position, tracks(*)")
        .eq("playlist_id", id)
        .order("position", { ascending: true });

      if (trackLinks) {
        const extractedTracks = trackLinks.map((row) => row.tracks);
        setTracks(extractedTracks);
      }

      setLoading(false);
    }

    loadPlaylist();
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading playlist...</div>;
  }

  if (!playlist) {
    return <div className="p-6">Playlist not found.</div>;
  }

  return (
    <div className="space-y-10 p-2 sm:p-4 lg:p-6">
      {/* HEADER */}
      <div className="flex gap-8 items-center">
        <div className="w-48 h-48 rounded-xl overflow-hidden shadow-[0_0_25px_rgba(0,255,198,0.18)] border border-[#00FFC622]">
          {playlist.cover_url ? (
            <img
              src={playlist.cover_url}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800" />
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-white mb-2">
            {playlist.title}
          </h1>

          {playlist.description && (
            <p className="text-white/70 max-w-lg">{playlist.description}</p>
          )}

          <p className="text-sm text-white/40 mt-4">
            {tracks.length} Tracks
          </p>
        </div>
      </div>

      {/* TRACKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))
        ) : (
          <p className="text-white/60">No tracks in this playlist yet.</p>
        )}
      </div>
    </div>
  );
}
