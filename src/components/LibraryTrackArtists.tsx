"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getArtistHref } from "@/lib/routes";

type Artist = { id: string; display_name: string };

export default function LibraryTrackArtists(props: {
  artists?: Artist[] | null;
  fallbackArtistId?: string | null;
  fallbackDisplayName?: string | null;
  disableLinks?: boolean;
  currentArtistId?: string | null;
}) {
  const router = useRouter();

  const goToArtistId = (
    artistId: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!artistId) return;
    router.push(getArtistHref(artistId));
  };

  const artistsArr: Artist[] = Array.isArray(props.artists) ? props.artists : [];
  const disableLinks = props.disableLinks === true;
  const currentArtistId = props.currentArtistId
    ? String(props.currentArtistId)
    : null;

  const isLinkDisabled = (artistId: string) => {
    if (disableLinks) return true;
    if (!artistId) return true;
    return currentArtistId === artistId;
  };

  if (artistsArr.length > 0) {
    return (
      <div className="mt-1 text-left text-xs text-white/60 truncate">
        {artistsArr.map((a, idx) => {
          const artistId = String(a.id ?? "");
          const artistName = String(a.display_name ?? "");
          const linkDisabled = isLinkDisabled(artistId);

          return (
            <span key={`${artistId || "unknown"}-${idx}`}>
              {linkDisabled ? (
                <span title={artistName}>{artistName}</span>
              ) : (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => goToArtistId(artistId, e)}
                  className="
                    cursor-pointer
                    hover:text-[#00FFC6] hover:underline underline-offset-2
                    transition-colors
                    focus:outline-none
                  "
                  title={artistName}
                >
                  {artistName}
                </button>
              )}
              {idx < artistsArr.length - 1 ? ", " : null}
            </span>
          );
        })}
      </div>
    );
  }

  if (props.fallbackArtistId && props.fallbackDisplayName) {
    const fallbackArtistId = String(props.fallbackArtistId);
    const fallbackDisplayName = String(props.fallbackDisplayName);
    const linkDisabled = isLinkDisabled(fallbackArtistId);

    if (linkDisabled) {
      return (
        <div
          className="mt-1 text-left text-xs text-white/60 truncate"
          title={fallbackDisplayName}
        >
          {fallbackDisplayName}
        </div>
      );
    }

    return (
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => goToArtistId(fallbackArtistId, e)}
        className="
          mt-1 text-left text-xs text-white/60 truncate
          cursor-pointer
          hover:text-[#00FFC6] hover:underline underline-offset-2
          transition-colors
          focus:outline-none
        "
        title={fallbackDisplayName}
      >
        {fallbackDisplayName}
      </button>
    );
  }

  return <div className="mt-1 text-xs text-white/40 truncate">Unknown artist</div>;
}
