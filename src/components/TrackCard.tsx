"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

type Props = {
  track: PlayerTrack;
  index: number;
  tracks: PlayerTrack[];
};

export default function TrackCard({ track, index, tracks }: Props) {
  const { currentTrack, isPlaying, togglePlay, playQueue } = usePlayer();

  const isThisTrackActive = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isThisTrackActive) {
      togglePlay();
    } else {
      playQueue(tracks, index);
    }
  };

  return (
    <Link
      href={`/dashboard/track/${track.id}`}
      className="
        group relative 
        bg-[#111112] 
        p-3 rounded-xl 
        transition-all
        hover:scale-[1.02]
        hover:shadow-[0_0_12px_rgba(0,255,198,0.15)]
        border border-transparent
        hover:border-[#00FFC622]
        cursor-pointer
        block
      "
    >
      <div className="relative">
        <div className="block">
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
        </div>

        <div
          className="
            absolute inset-0 flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-all duration-300
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
              handleClick();
            }}
            className="
              w-14 h-14 rounded-full
              bg-[#00FFC6] hover:bg-[#00E0B0]
              flex items-center justify-center
              shadow-[0_0_20px_rgba(0,255,198,0.40)]
              backdrop-blur-md
            "
            aria-label={isThisTrackActive && isPlaying ? "Pause track" : "Play track"}
          >
            {isThisTrackActive && isPlaying ? (
              <Pause size={26} className="text-black" />
            ) : (
              <Play size={26} className="text-black" />
            )}
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-white/90 truncate">
        {track.title}
      </h3>
      <p className="text-xs text-white/50 truncate">
        {track.profiles?.display_name ?? "Unknown Artist"}
      </p>
    </Link>
  );
}
