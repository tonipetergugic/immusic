"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

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
  return (
    <Link
      href={`/playlist/${id}`}
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
        {cover_url ? (
          <Image
            src={cover_url}
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
          <div
            className="
              w-14 h-14 rounded-full
              bg-[#00FFC6] hover:bg-[#00E0B0]
              flex items-center justify-center
              shadow-[0_0_20px_rgba(0,255,198,0.40)]
              backdrop-blur-md
            "
          >
            <Play size={26} className="text-black" />
          </div>
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
