"use client";

import Image from "next/image";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { Track } from "@/types/database";

type ArtistTrackListProps = {
  tracks: Track[];
  artistName: string | null;
};

export default function ArtistTrackList({
  tracks,
  artistName,
}: ArtistTrackListProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  if (!tracks || tracks.length === 0) {
    return <p className="text-neutral-400">No tracks yet.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {tracks.map((track) => {
        const isActive = currentTrack?.id === track.id;

        const handlePlay = () => {
          if (isActive) {
            togglePlay();
          } else {
            playTrack(track as any);
          }
        };

        return (
          <div
            key={track.id}
            className={`
              group
              flex items-center justify-between
              py-3 px-4
              rounded-lg
              transition
              cursor-pointer
              ${isActive ? "bg-[#1a1a1c] border border-[#00FFC6]/40" : "bg-[#111112] hover:bg-[#1a1a1c]"}
            `}
          >
            {/* LEFT: Cover + Text */}
            <div className="flex items-center gap-4">
              
              {/* COVER + HOVER PLAY */}
              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-800">
                {track.cover_url && (
                  <Image
                    src={track.cover_url}
                    alt={track.title}
                    fill
                    className="object-cover"
                  />
                )}

                {/* Hover Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay();
                  }}
                  className="
                    absolute inset-0 flex items-center justify-center
                    bg-black/40
                    opacity-0 group-hover:opacity-100
                    transition
                  "
                >
                  <div
                    className="
                      w-8 h-8 rounded-full
                      bg-[#00FFC6] hover:bg-[#00E0B0]
                      flex items-center justify-center
                      shadow-[0_0_10px_rgba(0,255,198,0.40)]
                    "
                  >
                    {isActive && isPlaying ? (
                      <Pause size={18} className="text-black" />
                    ) : (
                      <Play size={18} className="text-black" />
                    )}
                  </div>
                </button>
              </div>

              {/* TITLE + ARTIST */}
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm truncate max-w-[180px]">
                  {track.title}
                </span>
                <span className="text-neutral-400 text-xs truncate">
                  {artistName || "Unknown Artist"}
                </span>
              </div>
            </div>

            {/* RIGHT: BPM + KEY + status */}
            <div className="flex items-center gap-6 text-xs text-neutral-400">
              {track.bpm && <span>{track.bpm} BPM</span>}
              {track.key && <span>{track.key}</span>}

              {isActive && isPlaying && (
                <span className="text-[#00FFC6] font-semibold">Playing</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
