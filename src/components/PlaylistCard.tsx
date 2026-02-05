"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { usePlayer } from "@/context/PlayerContext";

type PlaylistCardProps = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  priority?: boolean;
};

export default function PlaylistCard({
  id,
  title,
  description,
  cover_url,
  priority = false,
}: PlaylistCardProps) {
  const coverPublicUrl =
    typeof cover_url === "string" && /^https?:\/\//.test(cover_url) ? cover_url : null;
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
      aria-label={`Open playlist: ${title}`}
      className="
        group relative 
        bg-[#111112] 
        p-2 rounded-xl 
        transition-all
        hover:scale-[1.015]
        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
        border border-transparent
        hover:border-[#00FFC622]
        block
        focus:outline-none
        focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60
        focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0E10]
      "
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white/5">
        {coverPublicUrl ? (
          <Image
            src={coverPublicUrl}
            alt={title}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="absolute inset-0 h-full w-full object-cover rounded-xl transition-all duration-300 group-hover:brightness-110 group-hover:shadow-[0_0_25px_rgba(0,255,198,0.12)]"
          />
        ) : (
          <div
            className="
              relative h-full rounded-xl overflow-hidden
              bg-white/[0.06]
              border border-white/10
            "
          >
            {/* subtle texture */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/20" />
            <div className="absolute inset-0 opacity-70 blur-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,198,0.12),transparent_55%)]" />

            <div className="relative z-10 flex items-center justify-center h-full">
              <div
                className="
                  inline-flex items-center justify-center
                  w-9 h-9
                  transition-opacity duration-150
                  pointer-events-none
                "
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14Z"
                    stroke="#00FFC6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.95"
                  />
                  <path
                    d="M8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                    stroke="#00FFC6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                  <path
                    d="M21 16l-5-5L5 21"
                    stroke="#00FFC6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="mt-2 block">
        <h3 className="text-[13px] font-semibold text-white/90 line-clamp-2 min-h-0">
          {title}
        </h3>

        {description ? (
          <p className="text-[11px] text-white/50 truncate block">{description}</p>
        ) : (
          <div className="h-[16px]" />
        )}
      </div>
    </Link>
  );
}
