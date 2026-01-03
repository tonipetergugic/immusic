"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";

type PlaylistCardProps = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
};

export default function PlaylistCard({
  id,
  title,
  description,
  cover_url,
}: PlaylistCardProps) {
  const coverPublicUrl =
    cover_url && (cover_url.startsWith("http://") || cover_url.startsWith("https://"))
      ? cover_url
      : null;
  const { playQueue, togglePlay, pause, currentTrack, isPlaying } = usePlayer();
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<Set<string>>(new Set());

  const isCurrentFromThisPlaylist =
    !!currentTrack?.id && playlistTrackIds.has(currentTrack.id);

  async function loadPlaylistQueue() {
    const res = await fetch(`/api/playlists/${id}/queue`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to load playlist queue (${res.status})`);
    }

    const json = (await res.json()) as { queue?: any[] };

    const queue = Array.isArray(json.queue) ? json.queue : [];

    setPlaylistTrackIds(new Set(queue.map((t: any) => t.id).filter(Boolean)));

    return queue;
  }

  return (
    <Link
      href={`/dashboard/playlist/${id}`}
      className="
        group relative 
        bg-[#111112] 
        p-3 rounded-xl 
        transition-all
        hover:scale-[1.02]
        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
        border border-transparent
        hover:border-[#00FFC622]
        cursor-pointer
        block
      "
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden">
        {coverPublicUrl ? (
          <Image
            src={coverPublicUrl}
            alt={title}
            fill
            className="
              object-cover rounded-xl
              transition-all duration-300
              group-hover:brightness-110
              group-hover:shadow-[0_0_25px_rgba(0,255,198,0.12)]
            "
          />
        ) : (
          <div className="w-full h-full bg-neutral-800 rounded-xl" />
        )}

        {/* Hover Play */}
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
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              // Wenn bereits ein Track aus dieser Playlist aktiv ist: toggle play/pause
              if (isCurrentFromThisPlaylist) {
                if (isPlaying) pause();
                else togglePlay();
                return;
              }

              try {
                setIsPlayLoading(true);
                const queue = await loadPlaylistQueue();
                if (queue.length === 0) return;
                playQueue(queue, 0);
              } catch (err: any) {
                console.error("PlaylistCard play error:", err?.message ?? err);
              } finally {
                setIsPlayLoading(false);
              }
            }}
            className="
              w-14 h-14 rounded-full
              bg-[#00FFC6] hover:bg-[#00E0B0]
              flex items-center justify-center
              shadow-[0_0_20px_rgba(0,255,198,0.40)]
              backdrop-blur-md
            "
            aria-label="Play playlist"
          >
            {isPlayLoading ? (
              <div className="h-4 w-4 animate-pulse rounded-sm bg-black/60" />
            ) : isCurrentFromThisPlaylist && isPlaying ? (
              <Pause size={26} className="text-black" />
            ) : (
              <Play size={26} className="text-black" />
            )}
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-white/90 truncate">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-white/50 truncate">{description}</p>
      )}
    </Link>
  );
}
