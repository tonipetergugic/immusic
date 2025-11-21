"use client";

import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export default function PlayOverlayButton({ track }: { track: any }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const isCurrent = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();       // wenn schon läuft → Pause/Resume
    } else {
      playTrack(track);   // neuer Track → Play
    }
  };

  return (
    <button
      onClick={handleClick}
      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    >
      <div className="h-16 w-16 rounded-full bg-[#00FFC6] hover:bg-[#00E0B0] flex items-center justify-center shadow-xl">
        {isCurrent && isPlaying ? (
          <Pause className="text-black" size={30} />
        ) : (
          <Play className="text-black" size={30} />
        )}
      </div>
    </button>
  );
}
