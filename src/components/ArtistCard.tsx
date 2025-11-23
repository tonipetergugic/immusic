"use client";

import Image from "next/image";
import Link from "next/link";

type ArtistCardProps = {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
};

export default function ArtistCard({
  id,
  display_name,
  avatar_url,
}: ArtistCardProps) {
  return (
    <Link
      href={`/artist/${id}`}
      className="
        group
        relative
        rounded-xl
        overflow-hidden
        cursor-pointer
        bg-[#111112]
        transition-all
        hover:scale-[1.02]
        hover:shadow-[0_0_16px_rgba(0,255,198,0.20)]
      "
    >
      <div className="relative w-full aspect-square">
        {avatar_url ? (
          <Image
            src={avatar_url}
            alt={display_name || 'Artist'}
            fill
            className="
              object-cover
              transition-all duration-300
              group-hover:brightness-110
            "
          />
        ) : (
          <div className="w-full h-full bg-neutral-800" />
        )}
      </div>

      <div
        className="
          absolute bottom-0 left-0 right-0
          p-3
          bg-gradient-to-t from-black/60 to-black/0
          transition-all duration-300
          group-hover:from-black/80
        "
      >
        <p className="
          text-base 
          font-semibold 
          text-white/95 
          truncate 
          tracking-wide
        ">
          {display_name || "Unknown Artist"}
        </p>
      </div>
    </Link>
  );
}
