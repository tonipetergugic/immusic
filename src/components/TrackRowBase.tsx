"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { PlayerTrack } from "@/types/playerTrack";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

type TrackRowBaseProps = {
  track: PlayerTrack;

  // For queue play on covers (standard behavior)
  index: number;
  tracks: PlayerTrack[];

  // Optional: async queue preparation (overrides tracks/index)
  getQueue?: () => Promise<{ tracks: PlayerTrack[]; index: number }>;

  // Optional: custom overlay button (overrides default PlayOverlayButton)
  coverOverlaySlot?: ReactNode;

  // Optional: show an index / drag handle area (caller provides)
  leadingSlot?: ReactNode;

  // Optional: custom title/subtitle rendering (buttons etc.)
  titleSlot?: ReactNode;
  subtitleSlot?: ReactNode;

  // Optional: meta under title/artist (ratings, progress, etc.)
  metaSlot?: ReactNode;

  // Optional: Desktop columns (like PlaylistRow)
  bpmSlot?: ReactNode; // md column (BPM)
  keySlot?: ReactNode; // md column (Key)
  genreSlot?: ReactNode; // md column (Genre)

  // Optional: Actions on the right (options, menus, etc.)
  actionsSlot?: ReactNode;

  // Back-compat: legacy single right slot (treated as actionsSlot)
  rightSlot?: ReactNode;

  // Optional: wrap the whole row with DnD props outside (caller does it)
  className?: string;

  // Navigation target (defaults to track detail)
  href?: string;

  // Optional: override cover url (useful when data has cover_path)
  coverUrl?: string | null;

  // Visual size of cover + overlay button
  coverSize?: "sm" | "md";
};

export default function TrackRowBase({
  track,
  index,
  tracks,
  getQueue,
  coverOverlaySlot,
  leadingSlot,
  titleSlot,
  subtitleSlot,
  metaSlot,
  bpmSlot,
  keySlot,
  genreSlot,
  actionsSlot,
  rightSlot,
  className,
  href,
  coverUrl,
  coverSize = "md",
}: TrackRowBaseProps) {
  const releaseId = (track as any)?.release_id ?? null;
  const to =
    href ??
    (releaseId ? `/dashboard/release/${releaseId}` : `/dashboard/track/${track.id}`);

  const coverBox = coverSize === "sm" ? "w-12 h-12" : "w-16 h-16";
  const overlaySize = coverSize === "sm" ? "sm" : "sm"; // rows: keep overlay compact

  const showDesktopCols = Boolean(bpmSlot || keySlot || genreSlot);

  return (
    <div
      className={[
        "group",
        "grid",
        "grid-cols-[16px_56px_1fr_36px]",
        showDesktopCols ? "lg:grid-cols-[40px_80px_1fr_56px_56px_180px_80px]" : "lg:grid-cols-[40px_80px_1fr_80px]",
        "items-center",
        "gap-x-2 md:gap-x-3",
        "w-full",
        "px-3 sm:px-4",
        "py-2",
        "rounded-none",
        "bg-transparent hover:bg-white/5",
        "border-b border-white/10 last:border-b-0",
        "transition-colors",
        className ?? "",
      ].join(" ")}
    >
      {/* Leading slot (index / drag handle etc.) */}
      <div className="text-white/50 text-[11px] tabular-nums">
        {leadingSlot ?? null}
      </div>

      {/* Cover + overlay play */}
      <div
        className={[
          "w-16 h-16 rounded-md overflow-hidden relative group bg-neutral-700 justify-self-start",
          coverBox,
        ].join(" ")}
      >
        {/* Cover image */}
        {((coverUrl ?? track.cover_url) ? true : false) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(coverUrl ?? track.cover_url) as string}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-white/5" />
        )}

        {coverOverlaySlot ?? (
          <PlayOverlayButton
            size={overlaySize}
            track={track}
            tracks={getQueue ? undefined : tracks}
            index={getQueue ? undefined : index}
            getQueue={getQueue}
          />
        )}
      </div>

      {/* Main: title/artist + meta */}
      <div className="min-w-0 ml-1 sm:ml-0 pl-2 sm:pl-0 flex flex-col gap-0 justify-self-start">
        {/* Line 1: Title */}
        {titleSlot ? (
          titleSlot
        ) : (
          <Link href={to} className="text-left text-[13px] font-semibold leading-tight text-white truncate hover:text-[#00FFC6] transition-colors">
            {formatTrackTitle(track.title, (track as any).version)}
          </Link>
        )}

        {/* Line 2: Artist */}
        {subtitleSlot ? (
          subtitleSlot
        ) : (
          <div className="text-left text-xs leading-tight text-white/60 truncate">
            {track.profiles?.display_name ?? "Unknown Artist"}
          </div>
        )}

        {/* Line 3: Meta */}
        {metaSlot ? <div className="mt-1">{metaSlot}</div> : null}
      </div>

      {showDesktopCols ? (
        <>
          {/* BPM (lg only) */}
          <div className="hidden lg:flex items-center justify-end text-white/50 text-sm tabular-nums">
            {bpmSlot ?? null}
          </div>

          {/* Key (lg only) */}
          <div className="hidden lg:flex items-center justify-end text-white/50 text-sm">
            {keySlot ?? null}
          </div>

          {/* Genre (lg only) */}
          <div className="hidden lg:flex items-center justify-center pl-6 text-white/50 text-sm truncate">
            {genreSlot ?? <span className="truncate">{track.genre ?? "—"}</span>}
          </div>
        </>
      ) : null}

      {/* Actions */}
      <div className="flex items-center justify-end min-w-[44px] min-h-[44px]">
        {(actionsSlot ?? rightSlot) ?? null}
      </div>
    </div>
  );
}
