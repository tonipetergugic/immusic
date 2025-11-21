"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { Database } from "@/types/supabase";

type Track = Database["public"]["Tables"]["tracks"]["Row"];

export default function TrackCard({ track }: { track: Track }) {
  const { playTrack } = usePlayer();

  return (
    <div className="group relative cursor-pointer bg-[#1a1a1d] p-3 rounded-xl transition hover:scale-[1.03]">
      {/* Cover */}
      {track.cover_url ? (
        <Image
          src={track.cover_url}
          alt={track.title}
          width={300}
          height={300}
          className="rounded-lg object-cover w-full h-auto"
        />
      ) : (
        <div className="w-full aspect-square bg-neutral-800 rounded-lg" />
      )}

      {/* Hover Play Button */}
      <button
        onClick={() => playTrack(track)}
        className="
          absolute bottom-6 right-6 
          opacity-0 group-hover:opacity-100 
          transition-all duration-300 
          bg-[#00FFC6] hover:bg-[#00E0B0]
          text-black p-3 rounded-full shadow-xl
        "
      >
        <Play size={20} />
      </button>

      {/* Title + Artist */}
      <h3 className="mt-3 text-sm font-semibold">{track.title}</h3>
      <p className="text-xs text-gray-400">{track.artist}</p>
    </div>
  );
}
