"use client";

import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";
import type { Playlist } from "@/types/database";

export default function PlaylistHeaderClient({
  playlist,
  playerTracks,
}: {
  playlist: Playlist;
  playerTracks: PlayerTrack[];
}) {
  const { currentTrack, isPlaying } = usePlayer();

  const isActive =
    !!currentTrack &&
    isPlaying &&
    playerTracks.some((track) => track.id === currentTrack.id);

  return (
    <div className="rounded-xl overflow-hidden relative">
      {/* BRIGHTENED + SATURATED COVER BLOOM */}
      <div
        className="
    absolute inset-0
    bg-cover bg-center
    blur-[40px]
    opacity-80
    brightness-125
    saturate-125
  "
        style={{
          backgroundImage: `url('${playlist.cover_url || ""}')`,
        }}
      />

      {/* SOFT DARK OVERLAY */}
      <div
        className="
    absolute inset-0
    bg-[rgba(0,0,0,0.40)]
  "
      />

      {/* TOP FADE (Spotify-like) */}
      <div
        className="
    absolute inset-0
    bg-gradient-to-b
    from-[rgba(0,0,0,0.0)]
    via-[rgba(0,0,0,0.30)]
    to-[rgba(0,0,0,0.55)]
  "
      />

      <div className="relative z-10 flex items-center gap-10 py-10 px-10">
        {/* COVER */}
        <div
          className={`
        w-64 h-64 rounded-xl overflow-hidden relative
        border bg-neutral-900
        transition-all duration-500 
        ${isActive 
          ? "shadow-[0_0_60px_rgba(0,255,198,0.25)] border-[#00FFC6]"
          : "shadow-[0_0_35px_rgba(0,255,198,0.12)] border-[#00FFC620]"
        }
        ${isActive ? "scale-[1.02]" : "scale-100"}
      `}
      >
          <img
            src={playlist.cover_url || "/placeholder.png"}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* TEXT */}
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-semibold text-white tracking-tight leading-tight">
            {playlist.title}
          </h1>

          <p className="text-white/90 text-lg font-medium max-w-lg">
            {playlist.description || "EDM Playlist"}
          </p>

          <p className="text-white/90 text-lg font-medium mt-2">
            {playerTracks.length} Tracks
          </p>
        </div>
      </div>
    </div>
  );
}

