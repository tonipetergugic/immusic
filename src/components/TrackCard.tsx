"use client";

import Image from "next/image";
import Link from "next/link";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import type { PlayerTrack } from "@/types/playerTrack";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import { usePlayer } from "@/context/PlayerContext";

type Props = {
  track: PlayerTrack;
  index: number;
  tracks: PlayerTrack[];
};

export default function TrackCard({ track, index, tracks }: Props) {
  // play handled by PlayOverlayButton (standardized)
  const { isTrackPlaybackBlocked } = usePlayer();
  const isBlocked = isTrackPlaybackBlocked(track);

  const releaseId = (track as any)?.release_id ?? null;
  const href = releaseId ? `/dashboard/release/${releaseId}` : "#";

  return (
    <Link
      href={href}
      aria-disabled={isBlocked}
      tabIndex={isBlocked ? -1 : undefined}
      onClick={(e) => {
        if (!isBlocked) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`
        group relative 
        bg-[#111112] 
        p-3 rounded-xl 
        transition-all
        border block
        ${
          isBlocked
            ? "border-white/10 opacity-60"
            : "border-transparent hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(0,255,198,0.15)] hover:border-[#00FFC622] cursor-pointer"
        }
      `}
    >
      <div className="relative">
        <div className="block">
          {track.cover_url ? (
            <Image
              src={track.cover_url}
              alt={track.title}
              width={300}
              height={300}
              className={`
                rounded-xl object-cover w-full h-auto
                transition-all duration-300
                ${
                  isBlocked
                    ? "grayscale"
                    : "group-hover:brightness-110 group-hover:shadow-[0_0_25px_rgba(0,255,198,0.12)]"
                }
              `}
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

      <h3 className={`mt-3 text-sm font-semibold truncate ${isBlocked ? "text-white/45" : "text-white/90"}`}>
        {formatTrackTitle(track.title, (track as any).version)}
      </h3>
      <p className={`text-xs truncate ${isBlocked ? "text-white/35" : "text-white/50"}`}>
        {track.profiles?.display_name ?? "Unknown Artist"}
      </p>
    </Link>
  );
}
