// /Users/tonipetergugic/immusic/src/app/dashboard/DashboardHomeClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause } from "lucide-react";
import type { HomeReleaseCard } from "@/lib/supabase/getHomeReleases";
import type { HomePlaylistCard } from "@/lib/supabase/getHomePlaylists";
import { fetchPerformanceDiscovery } from "@/lib/discovery/fetchPerformanceDiscovery.client";

type HomeModule = {
  id: string;
  title: string;
  module_type: "release" | "playlist" | "mixed";
  position: number;
};

type HomeItem = {
  id: string;
  module_id: string;
  item_type: "release" | "playlist";
  item_id: string;
  position: number;
};

type Props = {
  home: {
    modules: HomeModule[];
    itemsByModuleId: Record<string, HomeItem[]>;
  };
  releasesById: Record<string, HomeReleaseCard>;
  playlistsById: Record<string, HomePlaylistCard>;
};

async function fetchReleaseQueueForPlayer(releaseId: string) {
  const res = await fetch(`/api/releases/${releaseId}/queue`, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch release queue (${res.status}): ${text}`);
  }

  const data = await res.json();
  // support both response shapes:
  // - PlayerTrack[]
  // - { tracks: PlayerTrack[] }
  const tracks =
    Array.isArray(data)
      ? data
      : Array.isArray(data?.queue)
      ? data.queue
      : Array.isArray(data?.tracks)
      ? data.tracks
      : [];

  return tracks;
}

export default function DashboardHomeClient({ home, releasesById, playlistsById }: Props) {
  const { playQueue, togglePlay, pause, currentTrack, isPlaying } = usePlayer();
  const [perfPlayLoadingId, setPerfPlayLoadingId] = useState<string | null>(null);

  const [discoveryMode, setDiscoveryMode] = useState<"development" | "performance">("development");
  const [performanceItems, setPerformanceItems] = useState<any[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);

  useEffect(() => {
    if (discoveryMode !== "performance") return;

    let cancelled = false;

    async function load() {
      try {
        setPerformanceLoading(true);
        setPerformanceError(null);

        const items = await fetchPerformanceDiscovery(30);

        if (!cancelled) setPerformanceItems(items);
      } catch (err: any) {
        if (!cancelled) setPerformanceError(err?.message ?? "Failed to load performance candidates");
      } finally {
        if (!cancelled) setPerformanceLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [discoveryMode]);

  // Releases section (from home_modules + home_module_items)
  const releaseModule = home.modules.find((m) => m.module_type === "release") ?? null;
  const releaseItems = releaseModule ? home.itemsByModuleId[releaseModule.id] ?? [] : [];
  const playlistModule =
    home.modules.find((m) => m.module_type === "playlist") ?? null;

  const playlistItems = playlistModule
    ? home.itemsByModuleId[playlistModule.id] ?? []
    : [];

  return (
    <div className="space-y-6">
      {/* Discovery Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDiscoveryMode("development")}
          className={[
            "inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 active:scale-[0.97]",
            discoveryMode === "development"
              ? "bg-[#00FFC6] text-black shadow-[0_0_16px_rgba(0,255,198,0.25)] hover:bg-[#00E0B0]"
              : "border border-[#00FFC633] text-[#00FFC6] bg-black/20 backdrop-blur hover:border-[#00FFC6] hover:bg-[#00FFC610] hover:shadow-[0_0_24px_rgba(0,255,198,0.35)]",
          ].join(" ")}
        >
          Development
        </button>

        <button
          type="button"
          onClick={() => setDiscoveryMode("performance")}
          className={[
            "inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 active:scale-[0.97]",
            discoveryMode === "performance"
              ? "bg-[#00FFC6] text-black shadow-[0_0_16px_rgba(0,255,198,0.25)] hover:bg-[#00E0B0]"
              : "border border-[#00FFC633] text-[#00FFC6] bg-black/20 backdrop-blur hover:border-[#00FFC6] hover:bg-[#00FFC610] hover:shadow-[0_0_24px_rgba(0,255,198,0.35)]",
          ].join(" ")}
        >
          Performance
        </button>
      </div>

      {/* Development (EXAKT das bestehende Home) */}
      {discoveryMode === "development" ? (
        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {releaseModule?.title ?? "Releases"}
            </h2>

            {releaseItems.length === 0 ? (
              <p className="text-white/40">No releases configured for Home yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 items-start">
                {releaseItems
                  .filter((it) => it.item_type === "release")
                  .sort((a, b) => a.position - b.position)
                  .slice(0, 10)
                  .map((it) => (
                    <ExtraReleaseCard
                      key={it.id}
                      releaseId={it.item_id}
                      data={releasesById[it.item_id] ?? null}
                    />
                  ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {playlistModule?.title ?? "Playlists"}
            </h2>

            {playlistItems.length === 0 ? (
              <p className="text-white/40">No playlists configured for Home yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {playlistItems
                  .filter((it) => it.item_type === "playlist")
                  .sort((a, b) => a.position - b.position)
                  .slice(0, 10)
                  .map((it) => {
                    const pl = playlistsById[it.item_id];

                    if (!pl) {
                      return (
                        <div
                          key={it.id}
                          className="bg-[#111112] p-3 rounded-xl border border-transparent"
                        >
                          <div className="w-full aspect-square rounded-xl bg-white/10" />
                          <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
                          <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
                        </div>
                      );
                    }

                    return (
                      <PlaylistCard
                        key={it.id}
                        id={pl.id}
                        title={pl.title}
                        description={pl.description}
                        cover_url={pl.cover_url}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Performance (minimal list from performance_discovery_candidates via API) */
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Performance Discovery</h2>
            <p className="text-sm text-white/50">
              Tracks appear here once they have verified listener engagement and ratings.
            </p>
          </div>

          {performanceLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111112] px-4 py-3"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
                    <div className="mt-2 h-3 w-1/4 bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : performanceError ? (
            <p className="text-red-400 text-sm">{performanceError}</p>
          ) : performanceItems.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#111112] p-6">
              <h3 className="text-sm font-semibold text-white/80">
                No performance tracks yet
              </h3>
              <p className="mt-1 text-sm text-white/50">
                Tracks appear here once they have verified listener activity and ratings.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {performanceItems.map((it, idx) => {
                const trackId = it.track_id ?? it.trackId ?? it.id;
                const title = it.track_title ?? it.title ?? "Untitled";
                const artist = it.artist_name ?? it.artist ?? null;
                const ratingAvg = typeof it.rating_avg === "number" ? it.rating_avg : Number(it.rating_avg ?? 0);
                const ratingCount = typeof it.rating_count === "number" ? it.rating_count : Number(it.rating_count ?? 0);

                function starText(avg: number) {
                  const rounded = Math.round(avg * 2) / 2; // 0.5 steps
                  const full = Math.floor(rounded);
                  const half = rounded - full >= 0.5;
                  const empty = 5 - full - (half ? 1 : 0);
                  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, empty));
                }

                const releaseId = it.release_id ?? it.releaseId ?? null;
                const isCurrent = !!trackId && currentTrack?.id === trackId;

                return (
                  <div
                    key={trackId ?? `${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111112] px-4 py-3 hover:border-white/20 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!trackId) return;

                        if (isCurrent) {
                          if (isPlaying) pause();
                          else togglePlay();
                          return;
                        }

                        if (!releaseId) return;

                        try {
                          setPerfPlayLoadingId(trackId);

                          const queue = await fetchReleaseQueueForPlayer(releaseId);
                          if (!Array.isArray(queue) || queue.length === 0) return;

                          const startIndex = Math.max(
                            0,
                            queue.findIndex((t: any) => t?.id === trackId)
                          );

                          playQueue(queue, startIndex);
                        } catch (err: any) {
                          console.error("Performance play error:", err?.message ?? err);
                        } finally {
                          setPerfPlayLoadingId(null);
                        }
                      }}
                      className="
                        w-10 h-10 rounded-full
                        border border-[#00FFC633]
                        text-[#00FFC6]
                        bg-black/20 backdrop-blur
                        transition-all duration-300
                        hover:border-[#00FFC6]
                        hover:bg-[#00FFC610]
                        hover:shadow-[0_0_18px_rgba(0,255,198,0.25)]
                        active:scale-[0.96]
                        flex items-center justify-center
                      "
                      aria-label={isCurrent && isPlaying ? "Pause track" : "Play track"}
                      disabled={!trackId || !releaseId}
                      title={!releaseId ? "No release context for this track" : undefined}
                    >
                      {perfPlayLoadingId === trackId ? (
                        <div className="h-3 w-3 animate-pulse rounded-sm bg-[#00FFC6]" />
                      ) : isCurrent && isPlaying ? (
                        <Pause size={18} className="text-[#00FFC6]" />
                      ) : (
                        <Play size={18} className="text-[#00FFC6]" />
                      )}
                    </button>

                    <Link
                      href={trackId ? `/dashboard/track/${trackId}` : "#"}
                      className="min-w-0 flex-1"
                    >
                      <div className="text-sm font-semibold text-white/90 truncate">{title}</div>
                      <div className="flex items-center gap-2 text-xs text-white/50 min-w-0">
                        <span className="truncate">{artist ? artist : "—"}</span>

                        {ratingCount > 0 && (
                          <span className="shrink-0 text-[#00FFC6]/80">
                            {starText(ratingAvg)} <span className="text-white/40">({ratingCount})</span>
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExtraReleaseCard({
  releaseId,
  data,
}: {
  releaseId: string;
  data: HomeReleaseCard | null;
}) {
  const { playQueue, togglePlay, pause, currentTrack, isPlaying } = usePlayer();
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [firstTrackId, setFirstTrackId] = useState<string | null>(null);
  const router = useRouter();

  const isCurrent = !!firstTrackId && currentTrack?.id === firstTrackId;

  if (!data) {
    return (
      <div className="bg-[#111112] p-3 rounded-xl border border-transparent">
        <div className="w-full aspect-square rounded-xl bg-white/10" />
        <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
        <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
      </div>
    );
  }

  // NOTE: firstTrackId is set on first play click (no preload), to avoid N+1 queries.

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/dashboard/release/${data.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/dashboard/release/${data.id}`);
        }
      }}
      className="
        group relative 
        bg-[#111112] 
        p-2 rounded-xl
        transition-all
        hover:scale-[1.015]
        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
        border border-transparent
        hover:border-[#00FFC622]
        cursor-pointer
        block
        outline-none
      "
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden">
        {/* Release type badge (top-right) */}
        {data.release_type && (
          <div className="pointer-events-none absolute top-2 right-2 z-10 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 border border-white/10 backdrop-blur">
            {data.release_type}
          </div>
        )}
        {data.cover_url ? (
          <Image
            src={data.cover_url}
            alt={data.title}
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

        {/* Hover Play (unified with PlaylistCard) */}
        <div
          className="
            absolute inset-0 flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-all duration-300
          "
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              if (isCurrent) {
                if (isPlaying) pause();
                else togglePlay();
                return;
              }

              try {
                setIsPlayLoading(true);
                const queue = await fetchReleaseQueueForPlayer(releaseId);
                if (queue.length === 0) return;
                setFirstTrackId(queue[0].id);
                playQueue(queue, 0);
              } catch (err: any) {
                console.error("ExtraReleaseCard play error:", err?.message ?? err);
              } finally {
                setIsPlayLoading(false);
              }
            }}
            className="
              w-14 h-14 rounded-full
              bg-[#00FFC6] hover:bg-[#00E0B0]
              flex items-center justify-center
              shadow-[0_0_20px_rgba(0,255,198,0.40)]
              backdrop-blur-md
            "
            aria-label={isCurrent && isPlaying ? "Pause release" : "Play release"}
          >
            {isPlayLoading ? (
              <div className="h-4 w-4 animate-pulse rounded-sm bg-black/60" />
            ) : isCurrent && isPlaying ? (
              <Pause size={26} className="text-black" />
            ) : (
              <Play size={26} className="text-black" />
            )}
          </button>
        </div>
      </div>

      <h3 className="mt-2 text-sm font-semibold text-white/90 line-clamp-2 min-h-0">
        {data.title}
      </h3>

      {data.artist_id ? (
        <Link
          href={`/dashboard/artist/${data.artist_id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-white/50 truncate hover:text-[#00FFC6] transition-colors block"
        >
          {data.artist_name ?? "Unknown Artist"}
        </Link>
      ) : (
        <p className="text-xs text-white/50 truncate">
          {data.artist_name ?? "Unknown Artist"}
        </p>
      )}
    </div>
  );
}


