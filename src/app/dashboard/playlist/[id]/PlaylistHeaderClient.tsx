"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";
import type { Playlist } from "@/types/database";

export default function PlaylistHeaderClient({
  playlist,
  playerTracks,
  onAddTrack,
  actions,
}: {
  playlist: Playlist;
  playerTracks: PlayerTrack[];
  onAddTrack: () => void;
  actions?: ReactNode;
}) {
  const { currentTrack, isPlaying } = usePlayer();

  const isActive =
    !!currentTrack &&
    isPlaying &&
    playerTracks.some((track) => track.id === currentTrack.id);
  const isPublic = !!playlist.is_public;

  return (
    <div className="rounded-xl overflow-hidden relative">

      {/* BACKGROUND BLOOM */}
      <div
        className="
          absolute inset-0 bg-cover bg-center
          blur-[40px] opacity-80 brightness-125 saturate-125
          pointer-events-none
        "
        style={{
          backgroundImage: `url('${playlist.cover_url || ""}')`,
        }}
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.40)] pointer-events-none" />

      {/* TOP GRADIENT */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-b
          from-[rgba(0,0,0,0.0)]
          via-[rgba(0,0,0,0.30)]
          to-[rgba(0,0,0,0.55)]
          pointer-events-none
        "
      />

      {/* DESKTOP BUTTONS (top right) */}
      <div className="hidden md:flex absolute top-6 right-6 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onAddTrack}
            className="
              flex items-center gap-2
              px-4 h-10 rounded-md
              bg-[#1A1A1C]/80 border border-[#2A2A2D]
              text-white/80 text-sm
              hover:bg-[#2A2A2D]
              hover:text-white
              hover:border-[#00FFC622]
              hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
              backdrop-blur-lg transition
            "
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14m7-7H5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add Track
          </button>

          {actions}
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-10 py-10 px-10">

        {/* COVER */}
        <div
          className={`
            transition-all duration-500
            ${isActive ? "scale-[1.02]" : "scale-100"}
          `}
        >
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-[#1A1A1C] bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
            {playlist.cover_url ? (
              <Image
                src={playlist.cover_url}
                alt={playlist.title}
                fill
                className="object-cover rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white/40">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm4-6 3 3 4-4"
                    stroke="#00FFC6"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-xs text-white/60">Add cover</p>
              </div>
            )}
          </div>
        </div>

        {/* TEXT SECTION */}
        <div className="flex flex-col gap-3 w-full">

          {/* RESPONSIVE TITLE */}
          <h1
            className="
              font-semibold text-white tracking-tight leading-tight
              text-3xl sm:text-4xl md:text-5xl
              max-w-[70vw] md:max-w-[600px]
              truncate
            "
          >
            {playlist.title}
          </h1>

          <p className="text-white/90 text-lg font-medium max-w-lg">
            {playlist.description || "EDM Playlist"}
          </p>

          <p className="text-white/90 text-lg font-medium mt-2">
            {playerTracks.length} Tracks
          </p>

          <p className="text-white/70 text-sm mt-1">
            {isPublic ? "Public playlist" : "Private playlist"}
          </p>

          {/* MOBILE BUTTONS (under text) */}
          <div className="flex md:hidden mt-4 gap-3">
            <button
              onClick={onAddTrack}
              className="
                flex items-center gap-2
                px-4 h-10 rounded-md
                bg-[#1A1A1C]/80 border border-[#2A2A2D]
                text-white/80 text-sm
                hover:bg-[#2A2A2D]
                hover:text-white
                hover:border-[#00FFC622]
                hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
                backdrop-blur-lg transition
              "
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14m7-7H5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Add Track
            </button>

            {actions}
          </div>

        </div>
      </div>
    </div>
  );
}
