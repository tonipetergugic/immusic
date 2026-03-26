 "use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import CoverPlaceholder from "@/components/CoverPlaceholder";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import {
  fetchPerformanceDiscovery,
  type PerformanceDiscoveryItem,
} from "@/lib/discovery/fetchPerformanceDiscovery.client";
import TrackRowBase from "@/components/TrackRowBase";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import type { PlayerTrack } from "@/types/playerTrack";
import ExplicitBadge from "@/components/ExplicitBadge";

type Props = {
  playlistId: string;
  existingTrackIds: string[];
  isOwner: boolean;
  onTrackAdded: (track: PlayerTrack) => void;
};

type TrackMetaRow = {
  id: string;
  genre: string | null;
  version: string | null;
  is_explicit: boolean | null;
};

type ArtistRow = {
  id: string;
  display_name: string | null;
};

type ReleaseTrackRow = {
  id: string;
  track_id: string;
  release_id: string;
};

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
  release_track_id: string | null;
  rating_avg: number | null;
  rating_count: number;
  streams_30d: number;
};

export default function PlaylistSuggestedTracks({
  playlistId,
  existingTrackIds,
  isOwner,
  onTrackAdded,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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

        const performanceItems = await fetchPerformanceDiscovery(12);
        if (cancelled) return;

        const excluded = new Set(existingTrackIds);

        const baseItems = (performanceItems ?? []).filter(
          (item: PerformanceDiscoveryItem) =>
            !!item?.track_id &&
            !!item?.artist_id &&
            !excluded.has(item.track_id)
        );

        const trackIds = Array.from(
          new Set(baseItems.map((item) => item.track_id).filter(Boolean))
        );

        const artistIds = Array.from(
          new Set(baseItems.map((item) => item.artist_id).filter(Boolean))
        );

        const [
          { data: trackMetaRows },
          { data: artistRows },
          { data: releaseTrackRows },
        ] = await Promise.all([
          trackIds.length
            ? supabase
                .from("tracks")
                .select("id, genre, version, is_explicit")
                .in("id", trackIds)
                .returns<TrackMetaRow[]>()
            : Promise.resolve({ data: [] as TrackMetaRow[] }),
          artistIds.length
            ? supabase
                .from("profiles")
                .select("id, display_name")
                .in("id", artistIds)
                .returns<ArtistRow[]>()
            : Promise.resolve({ data: [] as ArtistRow[] }),
          trackIds.length
            ? supabase
                .from("release_tracks")
                .select("id, track_id, release_id")
                .in("track_id", trackIds)
                .returns<ReleaseTrackRow[]>()
            : Promise.resolve({ data: [] as ReleaseTrackRow[] }),
        ]);

        if (cancelled) return;

        const trackMetaMap = new Map(
          (trackMetaRows ?? []).map((row) => [
            row.id,
            {
              genre: row.genre ?? null,
              version: row.version ?? null,
            is_explicit: row.is_explicit ?? null,
            },
          ])
        );

        const artistMap = new Map(
          (artistRows ?? []).map((row) => [row.id, row.display_name ?? "Unknown artist"])
        );

        const releaseTrackMap = new Map(
          (releaseTrackRows ?? []).map((row) => [
            `${row.track_id}:${row.release_id}`,
            row.id,
          ])
        );

        const nextItems: SuggestedTrack[] = baseItems
          .map((item) => ({
            id: item.track_id,
            title: item.track_title?.trim() || "Untitled track",
            artist_id: item.artist_id,
            artist_name: artistMap.get(item.artist_id) ?? "Unknown artist",
            cover_url: item.release_cover_path
              ? supabase.storage
                  .from("release_covers")
                  .getPublicUrl(item.release_cover_path).data.publicUrl ?? null
              : null,
            version: trackMetaMap.get(item.track_id)?.version ?? null,
            is_explicit: !!trackMetaMap.get(item.track_id)?.is_explicit,
            genre: trackMetaMap.get(item.track_id)?.genre ?? null,
            release_id: item.release_id ?? null,
            release_track_id:
              item.release_id
                ? releaseTrackMap.get(`${item.track_id}:${item.release_id}`) ?? null
                : null,
            rating_avg:
              item.rating_avg !== null && item.rating_avg !== undefined
                ? Number(item.rating_avg)
                : null,
            rating_count: Number(item.rating_count ?? 0),
            streams_30d: Number(item.streams_30d ?? 0),
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
  }, [existingTrackIds, supabase]);

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
        version: (playerTrack as any).version ?? item.version ?? null,
        status: (playerTrack as any).status ?? "performance",
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
            className={index < fullStars ? "text-[#00FFC6]" : "text-white/25"}
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
            <span className="font-semibold text-[#00FFC6]">
              Ø {Number(item.rating_avg ?? 0).toFixed(1)}
            </span>{" "}
            <span className="text-white/50">({item.rating_count})</span>
          </span>
        ) : (
          <span className="whitespace-nowrap text-white/40">No ratings</span>
        )}

        <span className="text-white/30">·</span>

        <span className="whitespace-nowrap text-white/50">
          {item.streams_30d} streams
        </span>
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
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-sm text-white/50">
            No suggested tracks available right now.
          </p>
        </div>
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

            const track = {
              id: item.id,
              title: item.title,
              artist_id: item.artist_id,
              cover_url: item.cover_url,
              genre: item.genre,
              version: item.version,
              release_id: item.release_id,
              release_track_id: item.release_track_id,
              status: "performance",
              profiles: {
                display_name: item.artist_name,
              },
            } as any;

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
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`min-w-0 flex-1 text-left text-[14px] font-semibold truncate ${
                        track.status === "performance"
                          ? "text-[#00FFC6]"
                          : "text-white"
                      }`}
                      title={formatTrackTitle(item.title, item.version)}
                    >
                      {formatTrackTitle(item.title, item.version)}
                    </span>

                    {item.is_explicit ? <ExplicitBadge /> : null}
                  </div>
                }
                subtitleSlot={
                  <span
                    className="text-left text-[12px] text-white/50 truncate"
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
                        setModalTrack({
                          id: item.id,
                          title: item.title,
                          artist_id: item.artist_id,
                          cover_url: item.cover_url,
                          genre: item.genre,
                        } as PlayerTrack);
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
