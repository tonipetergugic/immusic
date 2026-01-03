"use client";

import { Play, Pause } from "lucide-react";
import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";

type Props = {
  playlistId: string;
  size?: "sm" | "lg";
};

export default function PlaylistPlayOverlayButton({ playlistId, size = "sm" }: Props) {
  const { playQueue, togglePlay, currentTrack, isPlaying } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);
  const [queueTracks, setQueueTracks] = useState<any[]>([]);

  const isCurrentFromThisPlaylist =
    !!currentTrack?.id && queueTracks.some((t: any) => t?.id === currentTrack.id);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentFromThisPlaylist) {
      togglePlay();
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/playlists/${playlistId}/queue`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load playlist queue (${res.status})`);
      }

      const json = await res.json();
      const playerTracks = Array.isArray(json.queue) ? json.queue : [];

      setQueueTracks(playerTracks);

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

