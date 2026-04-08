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
      className="group block rounded-xl bg-[#111112] p-2.5 transition-all hover:bg-[#151516] hover:shadow-[0_0_0_1px_rgba(0,255,198,0.06),0_0_18px_rgba(0,255,198,0.08)]"
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-900">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName ?? "Artist avatar"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-white/50">
            {displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      <div className="pt-2">
        <h3 className="truncate text-[13px] font-medium leading-tight text-white">
          {displayName || "Unknown artist"}
        </h3>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-white/50">
          Artist
        </p>
      </div>
    </Link>
  );
}
