"use client";

import Image from "next/image";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Track } from "@/types/database";

type Props = {
  track: Track;
};

export default function TrackCard({ track }: Props) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const isThisTrackActive = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isThisTrackActive) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  return (
    <div
      className="
        group relative cursor-pointer 
        bg-[#111112] 
        p-3 rounded-xl 
        transition-all
        hover:scale-[1.02]
        hover:shadow-[0_0_12px_rgba(0,255,198,0.15)]
        border border-transparent
        hover:border-[#00FFC622]
      "
    >
      <div
        className="relative"
        onClick={handleClick}
      >
        {track.cover_url ? (
          <Image
            src={track.cover_url}
            alt={track.title}
            width={300}
            height={300}
            className="
              rounded-xl object-cover w-full h-auto
              transition-all duration-300
              group-hover:brightness-110
              group-hover:shadow-[0_0_25px_rgba(0,255,198,0.12)]
            "
          />
        ) : (
          <div className="w-full aspect-square bg-neutral-800 rounded-xl" />
        )}

        <button
          onClick={handleClick}
          className="
            absolute inset-0 m-auto
            w-12 h-12 
            flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-all duration-300
            bg-[#00FFC6] hover:bg-[#00E0B0]
            text-black rounded-full
            shadow-[0_0_20px_rgba(0,255,198,0.4)]
            backdrop-blur-md
          "
          style={{ pointerEvents: 'auto' }}
        >
          {isThisTrackActive && isPlaying ? (
            <Pause size={22} />
          ) : (
            <Play size={22} />
          )}
        </button>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-white/90 truncate">
        {track.title}
      </h3>
      <p className="text-xs text-white/50 truncate">{track.artist}</p>
    </div>
  );
}
