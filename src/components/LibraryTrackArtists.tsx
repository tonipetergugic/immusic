"use client";

import React from "react";
import { useRouter } from "next/navigation";

type Artist = { id: string; display_name: string };

export default function LibraryTrackArtists(props: {
  artists?: Artist[] | null;
  fallbackArtistId?: string | null;
  fallbackDisplayName?: string | null;
}) {
  const router = useRouter();

  const goToArtistId = (artistId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!artistId) return;
    router.push(`/dashboard/artist/${artistId}`);
  };

  const artistsArr = Array.isArray(props.artists) ? props.artists : [];

  if (artistsArr.length > 0) {
    return (
      <div className="mt-1 text-left text-xs text-white/60 truncate">
        {artistsArr.map((a: any, idx: number) => (
          <span key={`${String(a?.id ?? "unknown")}-${idx}`}>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => goToArtistId(String(a?.id ?? ""), e)}
              className="
                hover:text-[#00FFC6] hover:underline underline-offset-2
                transition-colors
                focus:outline-none
              "
              title={String(a?.display_name ?? "")}
            >
              {String(a?.display_name ?? "")}
            </button>
            {idx < artistsArr.length - 1 ? ", " : null}
          </span>
        ))}
      </div>
    );
  }

  if (props.fallbackArtistId && props.fallbackDisplayName) {
    return (
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => goToArtistId(String(props.fallbackArtistId), e)}
        className="
          mt-1 text-left text-xs text-white/60 truncate
          hover:text-[#00FFC6] hover:underline underline-offset-2
          transition-colors
          focus:outline-none
        "
        title={String(props.fallbackDisplayName)}
      >
        {String(props.fallbackDisplayName)}
      </button>
    );
  }

  return <div className="mt-1 text-xs text-white/40 truncate">Unknown artist</div>;
}
