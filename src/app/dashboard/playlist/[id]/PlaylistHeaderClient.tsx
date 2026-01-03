"use client";

import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";
import type { Playlist } from "@/types/database";

type PlaylistOwnerJoin = {
  owner?: {
    id: string;
    display_name: string | null;
    role?: string | null;
  } | null;
};

export default function PlaylistHeaderClient({
  playlist,
  playerTracks,
  onEditCover,
  isOwner,
}: {
  playlist: Playlist & PlaylistOwnerJoin;
  playerTracks: PlayerTrack[];
  onEditCover: () => void;
  isOwner: boolean;
}) {
  const { currentTrack, isPlaying } = usePlayer();

  const isActive =
    !!currentTrack &&
    isPlaying &&
    playerTracks.some((track) => track.id === currentTrack.id);

  const isPublic = !!playlist.is_public;

  const coverPublicUrl = playlist.cover_url ?? null;

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
          backgroundImage: coverPublicUrl ? `url('${coverPublicUrl}')` : undefined,
        }}
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.40)] pointer-events-none" />

      {/* SOFT FADE GRADIENT (nach unten auslaufend) */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-b
          from-[rgba(0,0,0,0.00)]
          via-[rgba(0,0,0,0.25)]
          via-[rgba(0,0,0,0.45)]
          to-[rgba(14,14,16,0.95)]
          pointer-events-none
        "
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-10 pt-10 pb-14 px-10">
        {/* COVER */}
        <div
          className={`
            transition-all duration-500
            ${isActive ? "scale-[1.02]" : "scale-100"}
          `}
        >
          <div
            onClick={isOwner ? onEditCover : undefined}
            className={`
              relative w-[220px] h-[220px] md:w-[280px] md:h-[280px]
              rounded-xl overflow-hidden
              border border-[#1A1A1C] bg-gradient-to-br from-neutral-900 to-neutral-800
              flex items-center justify-center
              ${isOwner ? "cursor-pointer" : "cursor-default"}
            `}
          >
            {coverPublicUrl ? (
              <Image
                src={coverPublicUrl}
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
                <p className="mt-2 text-xs text-white/60">
                  {isOwner ? "Add cover" : "No cover"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* TEXT SECTION */}
        <div className="flex flex-col gap-3 w-full">
          <h1
            className="
              font-semibold text-white tracking-tight leading-tight
              text-5xl md:text-7xl
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

          {playlist.owner?.id ? (
            <p className="text-white/60 text-sm mt-1">
              Playlist by{" "}
              <a
                href={
                  playlist.owner.role === "artist"
                    ? `/dashboard/artist/${playlist.owner.id}`
                    : `/profile/${playlist.owner.id}`
                }
                className="hover:text-white underline underline-offset-2 transition"
              >
                {playlist.owner.display_name ?? "Unknown"}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

