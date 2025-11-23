"use client";

import { usePlayer } from "@/context/PlayerContext";

export default function PlaylistHeaderClient({ playlist, playlistTracks }) {
  const { currentTrack, isPlaying } = usePlayer();

  // Check if the current track belongs to this playlist
  const isActive = !!(
    currentTrack &&
    isPlaying &&
    playlistTracks.some((pt) => pt.tracks.id === currentTrack.id)
  );

  return (
    <div className="rounded-xl overflow-hidden relative">
      {/* BRIGHTENED + SATURATED COVER BLOOM */}
      <div
        className="
    absolute inset-0
    bg-cover bg-center
    blur-[80px]
    opacity-80
    brightness-150
    saturate-150
  "
        style={{
          backgroundImage: `url('${playlist.cover_url || ""}')`,
        }}
      />

      {/* SOFT DARK OVERLAY */}
      <div
        className="
    absolute inset-0
    bg-[rgba(0,0,0,0.30)]
  "
      />

      {/* TOP FADE (Spotify-like) */}
      <div
        className="
    absolute inset-0
    bg-gradient-to-b
    from-[rgba(0,0,0,0.0)]
    via-[rgba(0,0,0,0.25)]
    to-[rgba(0,0,0,0.50)]
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
          ? "shadow-[0_0_80px_rgba(0,255,198,0.35)] border-[#00FFC6]"
          : "shadow-[0_0_40px_rgba(0,255,198,0.15)] border-[#00FFC620]"
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

          <p className="text-white/80 text-lg font-medium max-w-lg">
            {playlist.description || "EDM Playlist"}
          </p>

          <p className="text-white/80 text-lg font-medium mt-2">
            {playlistTracks.length} Tracks
          </p>
        </div>
      </div>
    </div>
  );
}

