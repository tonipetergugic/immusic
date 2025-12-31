"use client";

import { Play, Pause } from "lucide-react";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { usePlayer } from "@/context/PlayerContext";
import { toPlayerTrackList } from "@/lib/playerTrack";

type Props = {
  playlistId: string;
  size?: "sm" | "lg";
};

export default function PlaylistPlayOverlayButton({ playlistId, size = "sm" }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { playQueue, togglePlay, currentTrack, isPlaying } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadTrackIds() {
      const { data } = await supabase
        .from("playlist_tracks")
        .select("tracks:track_id(id)")
        .eq("playlist_id", playlistId);

      if (data) {
        const ids = new Set(data.map((r: any) => r.tracks?.id).filter(Boolean));
        setPlaylistTrackIds(ids);
      }
    }

    loadTrackIds();
  }, [playlistId, supabase]);

  const isCurrentFromThisPlaylist =
    !!currentTrack?.id && playlistTrackIds.has(currentTrack.id);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentFromThisPlaylist) {
      togglePlay();
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("playlist_tracks")
        .select(
          `
          position,
          tracks:track_id (
            id,
            title,
            artist_id,
            audio_path,
            bpm,
            key,
            releases:release_id (
              id,
              cover_path,
              status
            ),
            profiles:artist_id (
              display_name
            )
          )
        `
        )
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as any[];
      const tracks = rows.map((r) => r.tracks).filter(Boolean);
      const playerTracks = toPlayerTrackList(tracks);

      if (playerTracks.length > 0) {
        playQueue(playerTracks, 0);
      }
    } catch (err) {
      console.error("PlaylistPlayOverlayButton error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={handleClick}
      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out backdrop-blur-sm"
    >
      <div
        className={`rounded-full bg-[#00FFC6] hover:bg-[#00E0B0] flex items-center justify-center shadow-md transition-transform duration-200 ease-out group-hover:scale-105 ${
          size === "lg" ? "w-14 h-14" : "h-9 w-9"
        }`}
      >
        {isLoading ? (
          <div className={`animate-pulse rounded-sm bg-black/60 ${size === "lg" ? "h-5 w-5" : "h-4 w-4"}`} />
        ) : isCurrentFromThisPlaylist && isPlaying ? (
          <Pause className="text-black" size={size === "lg" ? 26 : 18} />
        ) : (
          <Play className="text-black" size={size === "lg" ? 26 : 18} />
        )}
      </div>
    </button>
  );
}

