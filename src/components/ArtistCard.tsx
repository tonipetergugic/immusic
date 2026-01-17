"use client";

import Link from "next/link";

type ArtistCardProps = {
  artistId: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export default function ArtistCard({
  artistId,
  displayName,
  avatarUrl,
}: ArtistCardProps) {
  return (
    <Link
      href={`/dashboard/artist/${artistId}`}
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
        <div className="w-full aspect-square rounded-xl bg-neutral-900 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName ?? "Artist avatar"}
              className="w-full h-full object-cover rounded-xl transition-all duration-300 group-hover:brightness-110 group-hover:shadow-[0_0_25px_rgba(0,255,198,0.12)]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-5xl rounded-xl">
              {displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-[13px] font-semibold text-white/90 truncate">
        {displayName || "Unknown artist"}
      </h3>

      <p className="text-[11px] text-white/50 truncate">Artist</p>
    </Link>
  );
}
