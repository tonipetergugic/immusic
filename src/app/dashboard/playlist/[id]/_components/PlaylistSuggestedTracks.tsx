 "use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import {
  fetchPerformanceDiscovery,
  type PerformanceDiscoveryItem,
} from "@/lib/discovery/fetchPerformanceDiscovery.client";
import {
  fetchDevelopmentDiscovery,
  type DevelopmentDiscoveryItem,
} from "@/lib/discovery/fetchDevelopmentDiscovery.client";
import TrackRowBase from "@/components/TrackRowBase";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import type { PlayerTrack } from "@/types/playerTrack";
import ExplicitBadge from "@/components/ExplicitBadge";
import { usePlayer } from "@/context/PlayerContext";

type Props = {
  playlistId: string;
  existingTrackIds: string[];
  isOwner: boolean;
  onTrackAdded: (track: PlayerTrack) => void;
};

type DiscoveryMode = "performance" | "development";

type SuggestedTrack = {
  id: string;
  title: string;
  version: string | null;
  is_explicit: boolean;
  artist_id: string;
  artist_name: string;
  cover_url: string | null;
  genre: string | null;
  release_id: string | null;
  rating_avg: number | null;
  rating_count: number;
  streams_30d: number;
  status: DiscoveryMode;
};

function buildSuggestedPlayerTrack(item: SuggestedTrack): PlayerTrack {
  return {
    id: item.id,
    title: item.title,
    version: item.version ?? null,
    artist_id: item.artist_id,
    status: item.status,
    is_explicit: item.is_explicit,
    cover_url: item.cover_url ?? null,
    audio_url: "",
    genre: item.genre ?? null,
    profiles: {
      display_name: item.artist_name,
    },
    release_id: item.release_id ?? null,
    rating_avg: item.rating_avg,
    rating_count: item.rating_count,
  };
}

export default function PlaylistSuggestedTracks({
  playlistId,
  existingTrackIds,
  isOwner,
  onTrackAdded,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { currentTrack, isPlaying, isTrackPlaybackBlocked } = usePlayer();

  const [mode, setMode] = useState<DiscoveryMode>("performance");
  const [items, setItems] = useState<SuggestedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [modalTrack, setModalTrack] = useState<PlayerTrack | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const excluded = new Set(existingTrackIds);

        const performanceItems =
          mode === "performance" ? await fetchPerformanceDiscovery(12) : [];

        const developmentResponse =
          mode === "development"
            ? await fetchDevelopmentDiscovery({ limit: 12 })
            : null;

        if (cancelled) return;

        const baseItems =
          mode === "performance"
            ? (performanceItems ?? []).filter(
                (item: PerformanceDiscoveryItem) =>
                  !!item?.track_id &&
                  !!item?.artist_id &&
                  !excluded.has(item.track_id)
              )
            : (developmentResponse?.items ?? []).filter(
                (item: DevelopmentDiscoveryItem) =>
                  !!item?.track_id &&
                  !!item?.artist_id &&
                  !excluded.has(item.track_id)
              );

        const nextItems: SuggestedTrack[] =
          mode === "performance"
            ? (baseItems as PerformanceDiscoveryItem[])
                .map((item) => ({
                  id: item.track_id,
                  title: item.track_title?.trim() || "Untitled track",
                  artist_id: item.artist_id,
                  artist_name: item.artist_name ?? "Unknown artist",
                  cover_url: item.release_cover_path
                    ? supabase.storage
                        .from("release_covers")
                        .getPublicUrl(item.release_cover_path).data.publicUrl ?? null
                    : null,
                  version: item.version ?? null,
                  is_explicit: !!item.is_explicit,
                  genre: item.genre ?? null,
                  release_id: item.release_id ?? null,
                  rating_avg:
                    item.rating_avg !== null && item.rating_avg !== undefined
                      ? Number(item.rating_avg)
                      : null,
                  rating_count: Number(item.rating_count ?? 0),
                  streams_30d: Number(item.streams_30d ?? 0),
                  status: "performance" as const,
                }))
                .slice(0, 5)
            : (baseItems as DevelopmentDiscoveryItem[])
                .map((item) => ({
                  id: item.track_id,
                  title: item.title?.trim() || "Untitled track",
                  artist_id: item.artist_id,
                  artist_name: item.artist_name ?? "Unknown artist",
                  cover_url: item.cover_path
                    ? supabase.storage
                        .from("release_covers")
                        .getPublicUrl(item.cover_path).data.publicUrl ?? null
                    : null,
                  version: item.version ?? null,
                  is_explicit: !!item.is_explicit,
                  genre: item.genre ?? null,
                  release_id: item.release_id ?? null,
                  rating_avg:
                    item.rating_avg !== null && item.rating_avg !== undefined
                      ? Number(item.rating_avg)
                      : null,
                  rating_count: Number(item.rating_count ?? 0),
                  streams_30d: Number(item.stream_count ?? 0),
                  status: "development" as const,
                }))
                .slice(0, 5);

        setItems(nextItems);
      } catch (error) {
        console.error("Failed to load suggested playlist tracks:", error);
        if (!cancelled) {
          setItems([]);
          setErrorMessage("Suggested tracks konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [playlistId, existingTrackIds, mode, supabase]);

  const visibleItems = useMemo(() => {
    const excluded = new Set(existingTrackIds);
    return items.filter((item) => !excluded.has(item.id)).slice(0, 5);
  }, [existingTrackIds, items]);

  async function handleAdd(item: SuggestedTrack) {
    if (!isOwner) return;
    if (actionId) return;

    setActionId(item.id);
    setErrorMessage(null);

    try {
      const nextPosition = existingTrackIds.length + 1;

      const { error: insertError } = await supabase.from("playlist_tracks").insert({
        playlist_id: playlistId,
        track_id: item.id,
        position: nextPosition,
      });

      if (insertError) {
        console.error("Failed to insert suggested track into playlist:", insertError);
        setErrorMessage("Track konnte nicht hinzugefügt werden.");
        return;
      }

      const res = await fetch(`/api/tracks/${item.id}/player`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load playerTrack (${res.status})`);
      }

      const json = await res.json();
      const playerTrack = json?.playerTrack as PlayerTrack | undefined;

      if (!playerTrack?.id) {
        throw new Error("Invalid playerTrack payload");
      }

      const mergedPlayerTrack: PlayerTrack = {
        ...playerTrack,
        genre: playerTrack.genre ?? item.genre ?? null,
        version: playerTrack.version ?? item.version ?? null,
        status: playerTrack.status ?? item.status,
      };

      onTrackAdded(mergedPlayerTrack);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (error) {
      console.error("Failed to add suggested track:", error);
      setErrorMessage("Track konnte nicht hinzugefügt werden.");
    } finally {
      setActionId(null);
    }
  }

  function renderStars(avg: number | null) {
    const fullStars = Math.max(0, Math.min(5, Math.floor(avg ?? 0)));

    return (
      <div className="flex items-center gap-[2px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={index < fullStars ? "text-[#00FFC6]/60" : "text-white/20"}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  function renderMeta(item: SuggestedTrack) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/50">
        {renderStars(item.rating_avg)}

        {item.rating_count > 0 ? (
          <span className="tabular-nums whitespace-nowrap">
            <span className="font-semibold text-[#00FFC6]/70">
              Ø {Number(item.rating_avg ?? 0).toFixed(1)}
            </span>{" "}
            <span className="text-white/50">({item.rating_count})</span>
          </span>
        ) : (
          <span className="whitespace-nowrap text-white/40">No ratings</span>
        )}
      </div>
    );
  }

  return (
    <aside className="px-2">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">
          Suggested <span className="text-[#00FFC6]">tracks</span>
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Add strong discovery tracks directly to this playlist.
        </p>
      </div>

      <div className="mb-4">
        <div className="inline-flex rounded-full border border-[#00FFC622] bg-black/25 p-1 backdrop-blur shadow-[0_0_22px_rgba(0,255,198,0.10)]">
          <button
            type="button"
            onClick={() => setMode("development")}
            aria-pressed={mode === "development"}
            className={[
              "min-w-[140px] cursor-pointer rounded-full border px-5 py-3 text-base font-semibold transition-all duration-200",
              mode === "development"
                ? "border-[#00FFC655] bg-[#0B1614] text-white/90 shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                : "border-transparent bg-transparent text-white/70 hover:text-white/90",
            ].join(" ")}
          >
            Development
          </button>

          <button
            type="button"
            onClick={() => setMode("performance")}
            aria-pressed={mode === "performance"}
            className={[
              "min-w-[140px] cursor-pointer rounded-full border px-5 py-3 text-base font-semibold transition-all duration-200",
              mode === "performance"
                ? "border-[#00FFC655] bg-[#0B1614] text-white/90 shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                : "border-transparent bg-transparent text-white/70 hover:text-white/90",
            ].join(" ")}
          >
            Performance
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-400">{errorMessage}</p>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-2.5"
            >
              <div className="h-12 w-12 rounded-md bg-white/10 animate-pulse" />
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-3/4 rounded bg-white/10 animate-pulse" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="text-sm text-white/50">
          No suggested tracks available right now.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item, index) => {
            const isBusy = actionId === item.id;

            async function getQueue() {
              const res = await fetch(`/api/tracks/${item.id}/player`, {
                method: "GET",
                cache: "no-store",
              });

              if (!res.ok) {
                throw new Error(`Failed to load playerTrack (${res.status})`);
              }

              const json = await res.json();
              const playerTrack = json?.playerTrack as PlayerTrack | undefined;

              if (!playerTrack?.id) {
                throw new Error("Invalid playerTrack payload");
              }

              return {
                tracks: [
                  {
                    ...playerTrack,
                    genre: playerTrack.genre ?? item.genre ?? null,
                  },
                ],
                index: 0,
              };
            }

            const track = buildSuggestedPlayerTrack(item);
            const isBlocked = isTrackPlaybackBlocked(track);
            const isCurrent = currentTrack?.id === track.id;
            const isNowPlaying = isCurrent && isPlaying;

            return (
              <TrackRowBase
                key={item.id}
                track={track}
                index={index}
                tracks={[track]}
                getQueue={getQueue}
                coverSize="sm"
                className="border-b-0 px-0 grid-cols-[40px_56px_minmax(0,1fr)_0px] lg:grid-cols-[40px_56px_minmax(0,1fr)_0px]"
                titleSlot={
                  <>
                    {isNowPlaying ? (
                      <>
                        <div className="min-w-0 overflow-hidden md:hidden">
                          <div
                            className={`inline-flex w-max min-w-max items-center gap-6 whitespace-nowrap will-change-transform ${
                              isBlocked
                                ? "text-white/45"
                                : track.status === "performance"
                                ? "text-[#00FFC6]"
                                : "text-white"
                            }`}
                            style={{ animation: "trackTitleMarquee 10s linear infinite" }}
                            title={formatTrackTitle(item.title, item.version)}
                          >
                            {[0, 1].map((copyIndex) => (
                              <div
                                key={copyIndex}
                                className="inline-flex items-center gap-2 whitespace-nowrap"
                                aria-hidden={copyIndex === 1 ? "true" : undefined}
                              >
                                <span className="text-left text-[14px] font-semibold whitespace-nowrap">
                                  {formatTrackTitle(item.title, item.version)}
                                </span>
                                {item.is_explicit ? <ExplicitBadge /> : null}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="hidden min-w-0 overflow-hidden md:block">
                          <div
                            className={`inline-flex max-w-full items-center gap-2 whitespace-nowrap ${
                              isBlocked
                                ? "text-white/45"
                                : track.status === "performance"
                                ? "text-[#00FFC6]"
                                : "text-white"
                            }`}
                            title={formatTrackTitle(item.title, item.version)}
                          >
                            <span className="min-w-0 truncate text-left text-[14px] font-semibold">
                              {formatTrackTitle(item.title, item.version)}
                            </span>
                            {item.is_explicit ? <ExplicitBadge /> : null}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0 overflow-hidden">
                        <div
                          className={`inline-flex max-w-full items-center gap-2 whitespace-nowrap ${
                            isBlocked
                              ? "text-white/45"
                              : track.status === "performance"
                              ? "text-[#00FFC6]"
                              : "text-white"
                          }`}
                          title={formatTrackTitle(item.title, item.version)}
                        >
                          <span className="min-w-0 truncate text-left text-[14px] font-semibold">
                            {formatTrackTitle(item.title, item.version)}
                          </span>
                          {item.is_explicit ? <ExplicitBadge /> : null}
                        </div>
                      </div>
                    )}
                  </>
                }
                subtitleSlot={
                  <span
                    className={`text-left text-[12px] truncate ${isBlocked ? "text-white/35" : "text-white/50"}`}
                    title={item.artist_name}
                  >
                    {item.artist_name}
                  </span>
                }
                metaSlot={renderMeta(item)}
                leadingSlot={
                  <button
                    type="button"
                    onClick={() => {
                      if (isOwner) {
                        void handleAdd(item);
                      } else {
                        setModalTrack(buildSuggestedPlayerTrack(item));
                      }
                    }}
                    disabled={isBusy}
                    aria-label={isOwner ? `Add ${item.title}` : "Add to playlist"}
                    title={isOwner ? `Add ${item.title}` : "Add to playlist"}
                    className="
      inline-flex h-10 w-10 items-center justify-center
      text-[#00FFC6]
      cursor-pointer
      transition
      hover:text-[#00E0B0] hover:scale-110
      disabled:cursor-not-allowed disabled:opacity-45
    "
                  >
                    <Plus size={22} strokeWidth={2.4} />
                  </button>
                }
                actionsSlot={null}
              />
            );
          })}
        </div>
      )}

      {modalTrack && (
        <AddToPlaylistModal
          open={true}
          track={modalTrack}
          onClose={() => setModalTrack(null)}
        />
      )}
    </aside>
  );
}
