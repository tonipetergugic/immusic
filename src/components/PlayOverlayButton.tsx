"use client";

import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

type PlayOverlayButtonProps = {
  track: PlayerTrack;
  index?: number;
  tracks?: PlayerTrack[];
};

export default function PlayOverlayButton({ track, index, tracks }: PlayOverlayButtonProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, playQueue } = usePlayer();

  const isCurrent = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();
    } else if (tracks && typeof index === "number") {
      playQueue(tracks, index);
    } else {
      playTrack(track);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    >
      <div className="h-10 w-10 rounded-full bg-[#00FFC6] hover:bg-[#00E0B0] flex items-center justify-center shadow-md transition">
        {isCurrent && isPlaying ? (
          <Pause className="text-black" size={20} />
        ) : (
          <Play className="text-black" size={20} />
        )}
      </div>
    </button>
  );
}
