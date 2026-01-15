"use client";

import Image from "next/image";
import Link from "next/link";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import type { PlayerTrack } from "@/types/playerTrack";

type Props = {
  track: PlayerTrack;
  index: number;
  tracks: PlayerTrack[];
};

export default function TrackCard({ track, index, tracks }: Props) {
  // play handled by PlayOverlayButton (standardized)

  const releaseId = (track as any)?.release_id ?? null;
  const href = releaseId ? `/dashboard/release/${releaseId}` : `/dashboard/track/${track.id}`;

  return (
    <Link
      href={href}
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

        <PlayOverlayButton
          size="lg"
          track={track}
          tracks={tracks}
          index={index}
        />
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
