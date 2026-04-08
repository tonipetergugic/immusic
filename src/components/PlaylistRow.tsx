"use client";

import { memo } from "react";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import type { PlayerTrack } from "@/types/playerTrack";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import TrackRowBase from "@/components/TrackRowBase";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import { GripVertical } from "lucide-react";
import ExplicitBadge from "@/components/ExplicitBadge";
import { usePlayer } from "@/context/PlayerContext";

type PlaylistRowArtist = {
  id: string;
  display_name: string | null;
};

type PlaylistRowTrack = PlayerTrack & {
  release_id?: string | null;
  version?: string | null;
  artists?: PlaylistRowArtist[];
  rating_avg?: number | null;
  rating_count?: number | null;
  stream_count?: number | null;
  my_stars?: number | null;
};

function PlaylistRow({
  track,
  onDelete,
  tracks,
  user,
  dragHandleProps,
  showAddToPlaylist = true,
}: {
  track: PlaylistRowTrack;
  tracks: PlaylistRowTrack[];
  onDelete?: () => void;
  user: User | null;
  showAddToPlaylist?: boolean;
  dragHandleProps?: {
    listeners?: DraggableSyntheticListeners;
    setActivatorNodeRef: (node: HTMLButtonElement | null) => void;
  };
}) {
  const router = useRouter();
  const { currentTrack, isPlaying, isTrackPlaybackBlocked } = usePlayer();

  const currentIndex = tracks.findIndex((t) => t.id === track.id);
  const isBlocked = isTrackPlaybackBlocked(track);

  return (
    <div className="cursor-default">
      <TrackRowBase
        track={track}
        index={Math.max(currentIndex, 0)}
        tracks={tracks}
        coverSize="md"
        className="border-b-0" // ✅ border comes from wrapper (DnD wrapper), not from TrackRowBase
        leadingSlot={
          <div className="flex items-center gap-1">
            {dragHandleProps ? (
              <button
                ref={dragHandleProps.setActivatorNodeRef}
                type="button"
                aria-label="Reorder track"
                className="
      -ml-1 p-1 rounded
      text-white/40 hover:text-white/70
      cursor-grab active:cursor-grabbing
      touch-none
    "
                {...(dragHandleProps.listeners ?? {})}
              >
                <GripVertical size={16} />
              </button>
            ) : null}

            <div className="text-white/50 text-[11px] tabular-nums px-1 py-1">
              {currentIndex + 1}
            </div>
          </div>
        }
        titleSlot={
          <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden">
            {currentTrack?.id === track.id && isPlaying ? (
              <>
                <div className="flex-1 overflow-hidden md:hidden">
                  <div
                    className="flex w-max min-w-max items-center gap-6 whitespace-nowrap will-change-transform"
                    style={{ animation: "trackTitleMarquee 10s linear infinite" }}
                  >
                    {[0, 1].map((copyIndex) => (
                      <div
                        key={copyIndex}
                        className="inline-flex items-center gap-2 whitespace-nowrap"
                        aria-hidden={copyIndex === 1 ? "true" : undefined}
                      >
                        <button
                          type="button"
                          aria-disabled={isBlocked}
                          tabIndex={isBlocked ? -1 : undefined}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isBlocked) return;
                            if (track.release_id) {
                              router.push(`/dashboard/release/${track.release_id}`);
                            }
                          }}
                          className={`text-left text-[13px] font-semibold transition-colors focus:outline-none whitespace-nowrap ${
                            isBlocked
                              ? "text-white/45 cursor-default"
                              : track.status === "performance"
                              ? "text-[#00FFC6] hover:text-[#00E0B0] cursor-pointer"
                              : "text-white hover:text-[#00FFC6] cursor-pointer"
                          }`}
                          title={formatTrackTitle(track.title, track.version)}
                        >
                          {formatTrackTitle(track.title, track.version)}
                        </button>

                        {track.is_explicit ? <ExplicitBadge /> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden w-full min-w-0 items-center gap-2 overflow-hidden md:flex">
                  <button
                    type="button"
                    aria-disabled={isBlocked}
                    tabIndex={isBlocked ? -1 : undefined}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isBlocked) return;
                      if (track.release_id) {
                        router.push(`/dashboard/release/${track.release_id}`);
                      }
                    }}
                    className={`min-w-0 flex-1 text-left text-[13px] font-semibold truncate transition-colors focus:outline-none ${
                      isBlocked
                        ? "text-white/45 cursor-default"
                        : track.status === "performance"
                        ? "text-[#00FFC6] hover:text-[#00E0B0] cursor-pointer"
                        : "text-white hover:text-[#00FFC6] cursor-pointer"
                    }`}
                    title={formatTrackTitle(track.title, track.version)}
                  >
                    {formatTrackTitle(track.title, track.version)}
                  </button>

                  {track.is_explicit ? <ExplicitBadge /> : null}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  aria-disabled={isBlocked}
                  tabIndex={isBlocked ? -1 : undefined}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isBlocked) return;
                    if (track.release_id) {
                      router.push(`/dashboard/release/${track.release_id}`);
                    }
                  }}
                  className={`min-w-0 flex-1 text-left text-[13px] font-semibold truncate transition-colors focus:outline-none ${
                    isBlocked
                      ? "text-white/45 cursor-default"
                      : track.status === "performance"
                      ? "text-[#00FFC6] hover:text-[#00E0B0] cursor-pointer"
                      : "text-white hover:text-[#00FFC6] cursor-pointer"
                  }`}
                  title={formatTrackTitle(track.title, track.version)}
                >
                  {formatTrackTitle(track.title, track.version)}
                </button>

                {track.is_explicit ? <ExplicitBadge /> : null}
              </div>
            )}
          </div>
        }
        subtitleSlot={
          Array.isArray(track.artists) && track.artists.length > 0 ? (
            <div className={`mt-1 text-left text-xs truncate ${isBlocked ? "text-white/35" : "text-white/60"}`}>
              {track.artists.map((artist, idx) => (
                <span key={artist.id}>
                  <button
                    type="button"
                    aria-disabled={isBlocked}
                    tabIndex={isBlocked ? -1 : undefined}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isBlocked) return;
                      router.push(`/dashboard/artist/${artist.id}`);
                    }}
                    className={
                      isBlocked
                        ? "transition-colors focus:outline-none cursor-default text-white/35"
                        : `
                      cursor-pointer
                      hover:text-[#00FFC6] hover:underline underline-offset-2
                      transition-colors
                      focus:outline-none
                    `
                    }
                    title={String(artist.display_name)}
                  >
                    {String(artist.display_name)}
                  </button>
                  {idx < (track.artists?.length ?? 0) - 1 ? ", " : null}
                </span>
              ))}
            </div>
          ) : track.profiles?.display_name ? (
            <button
              type="button"
              aria-disabled={isBlocked}
              tabIndex={isBlocked ? -1 : undefined}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isBlocked) return;
                router.push(`/dashboard/artist/${track.artist_id}`);
              }}
              className={`mt-1 text-left text-xs truncate transition-colors focus:outline-none ${
                isBlocked
                  ? "text-white/35 cursor-default"
                  : "text-white/60 cursor-pointer hover:text-[#00FFC6] hover:underline underline-offset-2"
              }`}
              title={track.profiles.display_name}
            >
              {track.profiles.display_name}
            </button>
          ) : (
            <div className={`mt-1 text-xs truncate ${isBlocked ? "text-white/35" : "text-white/40"}`}>Unknown artist</div>
          )
        }
        metaSlot={
          <TrackRatingInline
            trackId={track.id}
            initialAvg={track.rating_avg ?? null}
            initialCount={track.rating_count ?? 0}
            initialStreams={track.stream_count ?? 0}
            initialMyStars={track.my_stars ?? null}
            readOnly={isBlocked}
            showStreamsOnDesktopOnly={true}
          />
        }
        bpmSlot={<span>{track.bpm ?? "—"}</span>}
        keySlot={<span>{track.key ?? "—"}</span>}
        genreSlot={null}
        actionsSlot={
          <TrackOptionsTrigger
            track={track}
            onRemove={onDelete}
            tracks={tracks}
            showAddToPlaylist={showAddToPlaylist}
          />
        }
      />
    </div>
  );
}

export default memo(PlaylistRow);
