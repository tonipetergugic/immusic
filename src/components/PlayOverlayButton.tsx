"use client";

import { useState } from "react";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

type PlayOverlayButtonProps = {
  track: PlayerTrack;

  // Visual size (rows vs cards). Default: "sm"
  size?: "sm" | "lg";

  // Optional: if the "current" identity differs from track.id (e.g. release card uses first track id)
  currentTrackId?: string;

  // Direct queue play (playlist rows etc.)
  index?: number;
  tracks?: PlayerTrack[];

  // Optional: async queue preparation (release cards etc.)
  getQueue?: () => Promise<{ tracks: PlayerTrack[]; index: number }>;
};

export default function PlayOverlayButton({
  track,
  size = "sm",
  currentTrackId,
  index,
  tracks,
  getQueue,
}: PlayOverlayButtonProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, playQueue } = usePlayer();
  const [loading, setLoading] = useState(false);

  const effectiveId = currentTrackId ?? track.id;
  const isCurrent = currentTrack?.id === effectiveId;

  const handleClick = async () => {
    if (loading) return;

    if (isCurrent) {
      togglePlay();
      return;
    }

    // Direct queue provided (fast path)
    if (tracks && typeof index === "number") {
      playQueue(tracks, index);
      return;
    }

    // Async queue preparation (e.g. release card)
    if (getQueue) {
      try {
        setLoading(true);
        const q = await getQueue();
        if (!q?.tracks || q.tracks.length === 0) return;
        playQueue(q.tracks, Math.max(0, q.index ?? 0));
        return;
      } finally {
        setLoading(false);
      }
    }

    // Fallback: play a single track
    playTrack(track);
  };

  return (
    <div
      className="
        absolute inset-0
        flex items-center justify-center
        bg-black/35
        opacity-100 sm:opacity-0 sm:group-hover:opacity-100
        transition-all duration-200
        pointer-events-none
      "
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleClick();
        }}
        className={[
          "pointer-events-auto",
          "rounded-full border border-[#00FFC655] bg-black/55 backdrop-blur",
          "flex items-center justify-center transition-transform duration-200 sm:group-hover:scale-105",
          size === "lg"
            ? "h-14 w-14 shadow-[0_0_26px_rgba(0,255,198,0.30)]"
            : "h-10 w-10 shadow-[0_0_18px_rgba(0,255,198,0.25)]",
        ].join(" ")}
        aria-label={isCurrent && isPlaying ? "Pause track" : "Play track"}
      >
        {loading ? (
          <div
            className={[
              "animate-pulse rounded-sm bg-[#00FFC6]",
              size === "lg" ? "h-5 w-5" : "h-4 w-4",
            ].join(" ")}
          />
        ) : isCurrent && isPlaying ? (
          <Pause className="text-[#00FFC6]" size={size === "lg" ? 26 : 20} />
        ) : (
          <Play className="text-[#00FFC6]" size={size === "lg" ? 26 : 20} />
        )}
      </button>
    </div>
  );
}
