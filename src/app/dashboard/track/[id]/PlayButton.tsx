"use client";

import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

export default function PlayButton({ track }: { track: PlayerTrack }) {
  const { currentTrack, isPlaying, togglePlay, playTrack } = usePlayer();
  const isActive = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isActive) togglePlay();
    else playTrack(track);
  };

  return (
    <button
      onClick={handleClick}
      className="
        w-14 h-14 rounded-full bg-[#00FFC6]
        flex items-center justify-center
        text-black hover:bg-[#00E0B0]
        shadow-md transition-all
      "
    >
      {isActive && isPlaying ? <Pause size={28} /> : <Play size={28} />}
    </button>
  );
}

