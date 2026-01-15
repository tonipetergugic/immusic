// /Users/tonipetergugic/immusic/src/app/dashboard/DashboardHomeClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import TrackRowBase from "@/components/TrackRowBase";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRatingInline from "@/components/TrackRatingInline";
import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause } from "lucide-react";
import type { HomeReleaseCard } from "@/lib/supabase/getHomeReleases";
import type { HomePlaylistCard } from "@/lib/supabase/getHomePlaylists";
import { fetchPerformanceDiscovery } from "@/lib/discovery/fetchPerformanceDiscovery.client";
import { fetchDevelopmentDiscovery } from "@/lib/discovery/fetchDevelopmentDiscovery.client";
import type { DevelopmentDiscoveryItem } from "@/lib/discovery/fetchDevelopmentDiscovery.client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { playQueue, togglePlay, pause, currentTrack, isPlaying } = usePlayer();
  const [perfPlayLoadingId, setPerfPlayLoadingId] = useState<string | null>(null);

  const [discoveryMode, setDiscoveryMode] = useState<"development" | "performance">("development");
  const [devItems, setDevItems] = useState<DevelopmentDiscoveryItem[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [devGenre, setDevGenre] = useState<string>("all");
  const [performanceItems, setPerformanceItems] = useState<any[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [perfArtistMap, setPerfArtistMap] = useState<Record<string, string>>({});
  const [perfReleaseTrackMap, setPerfReleaseTrackMap] = useState<Record<string, { release_track_id: string; rating_avg: number | null; rating_count: number; stream_count: number }>>({});
  const [perfMyStarsMap, setPerfMyStarsMap] = useState<Record<string, number>>({});
  const [perfTrackMetaMap, setPerfTrackMetaMap] = useState<Record<string, { bpm: number | null; key: string | null; genre: string | null }>>({});

  useEffect(() => {
    if (discoveryMode !== "performance") return;

    let cancelled = false;

    async function load() {
      try {
        setPerformanceLoading(true);
        setPerformanceError(null);

        const items = await fetchPerformanceDiscovery(30);

        if (Array.isArray(items) && items.length > 0) {
          console.log("[perf] first item:", items[0]);
          console.log("[perf] keys:", Object.keys(items[0] ?? {}));
        }

        if (!cancelled) setPerformanceItems(items);

        try {
          const artistIds = Array.from(new Set((items ?? []).map((x: any) => x.artist_id).filter(Boolean))) as string[];
          const trackIds = Array.from(new Set((items ?? []).map((x: any) => x.track_id).filter(Boolean))) as string[];
          const releaseIds = Array.from(new Set((items ?? []).map((x: any) => x.release_id).filter(Boolean))) as string[];

          // D) Track meta (bpm/key/genre)
          if (trackIds.length > 0) {
            const { data: tmeta, error: tmetaErr } = await supabase
              .from("tracks")
              .select("id, bpm, key, genre")
              .in("id", trackIds);

            if (!tmetaErr && tmeta) {
              const m: Record<string, { bpm: number | null; key: string | null; genre: string | null }> = {};
              for (const t of tmeta as any[]) {
                if (!t?.id) continue;
                m[t.id] = {
                  bpm: t.bpm ?? null,
                  key: t.key ?? null,
                  genre: t.genre ?? null,
                };
              }
              if (!cancelled) setPerfTrackMetaMap(m);
            }
          }

          // A) Artist display names
          if (artistIds.length > 0) {
            const { data: profs, error: profErr } = await supabase
              .from("profiles")
              .select("id, display_name")
              .in("id", artistIds);

            if (!profErr && profs) {
              const map: Record<string, string> = {};
              for (const r of profs as any[]) {
                if (r?.id) map[r.id] = r.display_name ?? "Unknown Artist";
              }
              if (!cancelled) setPerfArtistMap(map);
            }
          }

          // B) release_track_id + current agg (rating + streams) from release_tracks
          if (trackIds.length > 0 && releaseIds.length > 0) {
            const { data: rts, error: rtsErr } = await supabase
              .from("release_tracks")
              .select("id, track_id, release_id, rating_avg, rating_count, stream_count")
              .in("track_id", trackIds)
              .in("release_id", releaseIds);

            if (!rtsErr && rts) {
              const map: Record<string, { release_track_id: string; rating_avg: number | null; rating_count: number; stream_count: number }> = {};
              for (const rt of rts as any[]) {
                const key = `${rt.release_id}:${rt.track_id}`;
                map[key] = {
                  release_track_id: rt.id,
                  rating_avg: rt.rating_avg ?? null,
                  rating_count: rt.rating_count ?? 0,
                  stream_count: rt.stream_count ?? 0,
                };
              }
              if (!cancelled) setPerfReleaseTrackMap(map);
            }
          }
        } catch (e) {
          // ignore (UI fallback)
        }
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

  useEffect(() => {
    if (discoveryMode !== "development") return;

    let cancelled = false;

    async function loadDev() {
      try {
        setDevLoading(true);
        setDevError(null);

        const qs = new URLSearchParams();
        qs.set("limit", "20");
        if (devGenre && devGenre !== "all") qs.set("genre", devGenre);

        const r = await fetch(`/api/discovery/development?${qs.toString()}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await r.json();

        if (!r.ok || !data?.ok) {
          throw new Error(data?.details ? `${data?.error}: ${data?.details}` : data?.error ?? "dev_discovery_error");
        }

        if (!cancelled) setDevItems((data.items ?? []) as DevelopmentDiscoveryItem[]);
      } catch (err: any) {
        if (!cancelled) setDevError(err?.message ?? "Failed to load development tracks");
      } finally {
        if (!cancelled) setDevLoading(false);
      }
    }

    loadDev();

    return () => {
      cancelled = true;
    };
  }, [discoveryMode, devGenre]);

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
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-full border border-[#00FFC622] bg-black/25 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setDiscoveryMode("development")}
            className={[
              "inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
              discoveryMode === "development"
                ? "bg-[#0B1614] text-white/90 border border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                : "bg-transparent text-white/70 hover:text-white/90",
            ].join(" ")}
          >
            Development
          </button>

          <button
            type="button"
            onClick={() => setDiscoveryMode("performance")}
            className={[
              "inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
              discoveryMode === "performance"
                ? "bg-[#0B1614] text-white/90 border border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                : "bg-transparent text-white/70 hover:text-white/90",
            ].join(" ")}
          >
            Performance
          </button>
        </div>
      </div>

      {/* Development (EXAKT das bestehende Home) */}
      {discoveryMode === "development" ? (
        <div className="space-y-10 pb-[calc(env(safe-area-inset-bottom)+120px)]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {releaseModule?.title ?? "Releases"}
            </h2>

            {releaseItems.length === 0 ? (
              <p className="text-white/40">No releases configured for Home yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 items-start">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 items-start">
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

          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Development Tracks</h2>
                <p className="text-sm text-white/50">
                  All tracks currently in Development Discovery.
                </p>
              </div>

              <div className="shrink-0">
                <label className="sr-only" htmlFor="dev-genre">Genre</label>
                <select
                  id="dev-genre"
                  value={devGenre}
                  onChange={(e) => setDevGenre(e.target.value)}
                  className="
                    h-10 rounded-full px-4 text-sm
                    bg-black/25 border border-white/10
                    text-white/80
                    focus:outline-none focus:ring-2 focus:ring-[#00FFC655]
                  "
                >
                  <option value="all">All genres</option>
                  {Array.from(
                    new Set((devItems ?? []).map((x) => (x.genre ?? "").trim()).filter(Boolean))
                  )
                    .sort((a, b) => a.localeCompare(b))
                    .map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                </select>
              </div>
            </div>

            {devLoading ? (
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
            ) : devError ? (
              <p className="text-red-400 text-sm">{devError}</p>
            ) : devItems.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#111112] p-6">
                <h3 className="text-sm font-semibold text-white/80">
                  No development tracks yet
                </h3>
                <p className="mt-1 text-sm text-white/50">
                  Tracks will appear here when they enter Development Discovery.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {devItems.slice(0, 20).map((it, idx) => {
                  const trackId = it.track_id;
                  const title = it.title || "Untitled";
                  const artist = it.artist_name ?? "—";
                  const releaseId = it.release_id;

                  const coverUrl = it.cover_path
                    ? supabase.storage.from("release_covers").getPublicUrl(it.cover_path).data.publicUrl
                    : null;

                  const rowTrack = {
                    id: trackId,
                    artist_id: it.artist_id,
                    title,
                    cover_url: coverUrl,
                    profiles: { display_name: artist },
                    release_id: releaseId,
                    release_track_id: it.release_track_id ?? null,
                    rating_avg: it.rating_avg ?? null,
                    rating_count: it.rating_count ?? 0,
                    stream_count: it.stream_count ?? 0,
                    my_stars: it.my_stars ?? null,
                    bpm: it.bpm ?? null,
                    key: it.key ?? null,
                  } as any;

                  return (
                    <TrackRowBase
                      key={trackId ?? `${idx}`}
                      track={rowTrack}
                      index={0}
                      tracks={[] as any}
                      coverUrl={coverUrl}
                      coverSize="md"
                      getQueue={
                        releaseId
                          ? async () => {
                              const queue = await fetchReleaseQueueForPlayer(releaseId);
                              if (!Array.isArray(queue) || queue.length === 0) return { tracks: [], index: 0 };
                              const startIndex = queue.findIndex((t: any) => t?.id === trackId);
                              return { tracks: queue as any, index: Math.max(0, startIndex) };
                            }
                          : undefined
                      }
                      leadingSlot={idx + 1}
                      titleSlot={
                        <div className="flex items-center min-w-0">
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => {
                              const releaseId = rowTrack.release_id ?? null;
                              router.push(releaseId ? `/dashboard/release/${releaseId}` : `/dashboard/track/${trackId}`);
                            }}
                            className="
                              text-left text-[13px] font-semibold text-white truncate
                              hover:text-[#00FFC6] transition-colors
                              focus:outline-none
                            "
                            title={title}
                          >
                            {title}
                          </button>
                        </div>
                      }
                      subtitleSlot={
                        it.artist_id ? (
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => router.push(`/dashboard/artist/${it.artist_id}`)}
                            className="
                              mt-1 text-left text-xs text-white/60 truncate
                              hover:text-[#00FFC6] hover:underline underline-offset-2
                              transition-colors
                              focus:outline-none
                            "
                            title={artist}
                          >
                            {artist}
                          </button>
                        ) : (
                          <div className="mt-1 text-xs text-white/40 truncate">Unknown artist</div>
                        )
                      }
                      metaSlot={
                        rowTrack.release_track_id ? (
                          <TrackRatingInline
                            releaseTrackId={rowTrack.release_track_id}
                            initialAvg={rowTrack.rating_avg}
                            initialCount={rowTrack.rating_count}
                            initialStreams={rowTrack.stream_count}
                            initialMyStars={rowTrack.my_stars}
                          />
                        ) : (
                          <span className="text-xs text-white/60">★</span>
                        )
                      }
                      bpmSlot={<span className="text-white/50 text-sm">{rowTrack.bpm ?? "—"}</span>}
                      keySlot={<span className="text-white/50 text-sm">{rowTrack.key ?? "—"}</span>}
                      genreSlot={<span className="text-white/50 text-sm">{it.genre ?? "—"}</span>}
                      actionsSlot={
                        <TrackOptionsTrigger
                          track={rowTrack as any}
                          showGoToArtist={true}
                          showGoToRelease={true}
                          releaseId={releaseId}
                        />
                    }
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
                const trackId = it.track_id;
                const title = it.track_title || "Untitled";
                const artistId = it.artist_id;
                const releaseId = it.release_id;

                const artistName = perfArtistMap[artistId] ?? "Unknown Artist";

                const coverUrl = it.release_cover_path
                  ? supabase.storage.from("release_covers").getPublicUrl(it.release_cover_path).data.publicUrl
                  : null;

                const rtKey = `${releaseId}:${trackId}`;
                const rt = perfReleaseTrackMap[rtKey];

                const rowTrack = {
                  id: trackId,
                  artist_id: artistId,
                  title,
                  cover_url: coverUrl,
                  profiles: { display_name: artistName },
                  release_id: releaseId,
                  release_track_id: rt?.release_track_id ?? null,
                  rating_avg: rt?.rating_avg ?? (it.rating_avg ?? null),
                  rating_count: rt?.rating_count ?? (it.rating_count ?? 0),
                  stream_count: rt?.stream_count ?? (it.streams_30d ?? 0),
                } as any;

                return (
                  <TrackRowBase
                    key={trackId ?? `${idx}`}
                    track={rowTrack}
                    index={0}
                    tracks={[rowTrack] as any}
                    coverUrl={coverUrl}
                    coverSize="md"
                    getQueue={
                      trackId && releaseId
                        ? async () => {
                            const queue = await fetchReleaseQueueForPlayer(releaseId);
                            if (!Array.isArray(queue) || queue.length === 0) return { tracks: [], index: 0 };
                            const startIndex = queue.findIndex((t: any) => t?.id === trackId);
                            return { tracks: queue as any, index: Math.max(0, startIndex) };
                          }
                        : undefined
                    }
                    leadingSlot={idx + 1}
                    titleSlot={
                      <div className="flex items-center min-w-0">
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => {
                            const releaseId = rowTrack.release_id ?? null;
                            router.push(releaseId ? `/dashboard/release/${releaseId}` : `/dashboard/track/${trackId}`);
                          }}
                          className="
                            text-left text-[13px] font-semibold text-white truncate
                            hover:text-[#00FFC6] transition-colors
                            focus:outline-none
                          "
                          title={title}
                        >
                          {title}
                        </button>
                      </div>
                    }
                    subtitleSlot={
                      artistId ? (
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => router.push(`/dashboard/artist/${artistId}`)}
                          className="
                            mt-1 text-left text-xs text-white/60 truncate
                            hover:text-[#00FFC6] hover:underline underline-offset-2
                            transition-colors
                            focus:outline-none
                          "
                          title={artistName}
                        >
                          {artistName}
                        </button>
                      ) : (
                        <div className="mt-1 text-xs text-white/40 truncate">Unknown artist</div>
                      )
                    }
                    metaSlot={
                      rowTrack.release_track_id ? (
                        <TrackRatingInline
                          readOnly={true}
                          releaseTrackId={rowTrack.release_track_id}
                          initialAvg={rowTrack.rating_avg}
                          initialCount={rowTrack.rating_count}
                          initialStreams={rowTrack.stream_count}
                          initialMyStars={null}
                        />
                      ) : (
                        <span className="text-xs text-white/60">★</span>
                      )
                    }
                    actionsSlot={
                      <TrackOptionsTrigger
                        track={rowTrack as any}
                        showGoToArtist={true}
                        showGoToRelease={true}
                        releaseId={releaseId}
                      />
                    }
                    coverOverlaySlot={
                      trackId && releaseId ? (
                        <PlayOverlayButton
                          size="sm"
                          track={{ id: trackId } as any}
                          currentTrackId={trackId}
                          getQueue={async () => {
                            const queue = await fetchReleaseQueueForPlayer(releaseId);
                            if (!Array.isArray(queue) || queue.length === 0) return { tracks: [], index: 0 };

                            const startIndex = Math.max(
                              0,
                              queue.findIndex((t: any) => t?.id === trackId)
                            );

                            return { tracks: queue as any, index: startIndex };
                          }}
                        />
                      ) : null
                    }
                    bpmSlot={
                      <span className="text-white/50 text-sm tabular-nums">
                        {perfTrackMetaMap[trackId]?.bpm ?? "—"}
                      </span>
                    }
                    keySlot={
                      <span className="text-white/50 text-sm">
                        {perfTrackMetaMap[trackId]?.key ?? "—"}
                      </span>
                    }
                    genreSlot={
                      <span className="text-white/50 text-sm truncate">
                        {perfTrackMetaMap[trackId]?.genre ?? "—"}
                      </span>
                    }
                  />
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

        {/* Hover Play (standardized) */}
        <PlayOverlayButton
          size="lg"
          // dummy track object; we only need an id for current matching
          track={{ id: firstTrackId ?? releaseId } as any}
          currentTrackId={firstTrackId ?? undefined}
          getQueue={async () => {
            const queue = await fetchReleaseQueueForPlayer(releaseId);
            if (!Array.isArray(queue) || queue.length === 0) return { tracks: [], index: 0 };
            setFirstTrackId(queue[0].id);
            return { tracks: queue as any, index: 0 };
          }}
        />
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


