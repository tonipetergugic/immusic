"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import PlayOverlayButton from "@/components/PlayOverlayButton";

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
  const { currentTrack } = usePlayer();
  const [playlistTrackIds, setPlaylistTrackIds] = useState<Set<string>>(new Set());

  const isCurrentFromThisPlaylist =
    !!currentTrack?.id && playlistTrackIds.has(currentTrack.id);

  async function getPlaylistQueue() {
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

    return { tracks: queue, index: 0 };
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

        {/* Hover Play (standardized) */}
        <PlayOverlayButton
          size="lg"
          track={{ id } as any}
          currentTrackId={isCurrentFromThisPlaylist ? (currentTrack?.id ?? undefined) : undefined}
          getQueue={async () => {
            return (await getPlaylistQueue()) as any;
          }}
        />
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
