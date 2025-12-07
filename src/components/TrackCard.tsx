"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

type Props = {
  track: PlayerTrack;
  index: number;
  tracks: PlayerTrack[];
};

export default function TrackCard({ track, index, tracks }: Props) {
  const { currentTrack, isPlaying, togglePlay, playQueue } = usePlayer();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [publicCoverUrl, setPublicCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!track.cover_url) return;

    const { data } = supabase.storage
      .from("track-files")
      .getPublicUrl(track.cover_url);

    setPublicCoverUrl(data.publicUrl ?? null);
  }, [track.cover_url]);

  const isThisTrackActive = currentTrack?.id === track.id;

  const handleClick = () => {
    if (isThisTrackActive) {
      togglePlay();
    } else {
      playQueue(tracks, index);
    }
  };

  return (
    <div
      className="
        group relative cursor-pointer 
        bg-[#111112] 
        p-3 rounded-xl 
        transition-all
        hover:scale-[1.02]
        hover:shadow-[0_0_12px_rgba(0,255,198,0.15)]
        border border-transparent
        hover:border-[#00FFC622]
      "
    >
      <div className="relative">
        <Link href={`/dashboard/track/${track.id}`}>
          {publicCoverUrl ? (
            <Image
              src={publicCoverUrl}
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
        </Link>

        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleClick();
          }}
          className="
            absolute inset-0 m-auto
            w-12 h-12 
            flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-all duration-300
            bg-[#00FFC6] hover:bg-[#00E0B0]
            text-black rounded-full
            shadow-[0_0_20px_rgba(0,255,198,0.4)]
            backdrop-blur-md
          "
          style={{ pointerEvents: "auto" }}
        >
          {isThisTrackActive && isPlaying ? (
            <Pause size={22} />
          ) : (
            <Play size={22} />
          )}
        </button>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-white/90 truncate">
        {track.title}
      </h3>
      <p className="text-xs text-white/50 truncate">
        {track.profiles?.display_name ?? "Unknown Artist"}
      </p>
    </div>
  );
}
