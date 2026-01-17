// /Users/tonipetergugic/immusic/src/app/dashboard/DashboardHomeClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PlaylistCard from "@/components/PlaylistCard";
import TrackRowBase from "@/components/TrackRowBase";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import ReleaseCard, { type ReleaseCardData } from "@/components/ReleaseCard";
import TrackRatingInline from "@/components/TrackRatingInline";
import type { HomeReleaseCard } from "@/lib/supabase/getHomeReleases";
import type { HomePlaylistCard } from "@/lib/supabase/getHomePlaylists";
import { fetchPerformanceDiscovery } from "@/lib/discovery/fetchPerformanceDiscovery.client";
import type { DevelopmentDiscoveryItem } from "@/lib/discovery/fetchDevelopmentDiscovery.client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerTrack } from "@/types/playerTrack";

type HomeModule = {
  id: string;
  title: string;
  module_type:
    | "release"
    | "playlist"
    | "mixed"
    | "performance_release"
    | "performance_playlist";
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
  homeReleaseIds: string[];
  homePlaylistIds: string[];
  performanceReleaseIds: string[];
  performancePlaylistIds: string[];
};

export default function DashboardHomeClient({
  home,
  releasesById,
  playlistsById,
  homeReleaseIds,
  homePlaylistIds,
  performanceReleaseIds,
  performancePlaylistIds,
}: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [discoveryMode, setDiscoveryMode] = useState<"development" | "performance">("development");
  const [devItems, setDevItems] = useState<DevelopmentDiscoveryItem[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [devGenre, setDevGenre] = useState<string>("all");
  const [performanceGenre, setPerformanceGenre] = useState<string>("all");
  const [performanceItems, setPerformanceItems] = useState<any[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [perfArtistMap, setPerfArtistMap] = useState<Record<string, string>>({});
  const [perfReleaseTrackMap, setPerfReleaseTrackMap] = useState<Record<string, { release_track_id: string; rating_avg: number | null; rating_count: number; stream_count: number }>>({});
  const [perfTrackMetaMap, setPerfTrackMetaMap] = useState<
    Record<string, { bpm: number | null; key: string | null; genre: string | null; audio_path: string | null }>
  >({});

  useEffect(() => {
    if (discoveryMode !== "performance") return;

    let cancelled = false;

    async function load() {
      try {
        setPerformanceLoading(true);
        setPerformanceError(null);

        const items = await fetchPerformanceDiscovery(30);

        if (!cancelled) setPerformanceItems(items);

        try {
          const artistIds = Array.from(new Set((items ?? []).map((x: any) => x.artist_id).filter(Boolean))) as string[];
          const trackIds = Array.from(new Set((items ?? []).map((x: any) => x.track_id).filter(Boolean))) as string[];
          const releaseIds = Array.from(new Set((items ?? []).map((x: any) => x.release_id).filter(Boolean))) as string[];

          // D) Track meta (bpm/key/genre)
          if (trackIds.length > 0) {
            const { data: tmeta, error: tmetaErr } = await supabase
              .from("tracks")
              .select("id, bpm, key, genre, audio_path")
              .in("id", trackIds);

            if (!tmetaErr && tmeta) {
              const m: Record<string, { bpm: number | null; key: string | null; genre: string | null; audio_path: string | null }> = {};
              for (const t of tmeta as any[]) {
                if (!t?.id) continue;
                m[t.id] = {
                  bpm: t.bpm ?? null,
                  key: t.key ?? null,
                  genre: t.genre ?? null,
                  audio_path: t.audio_path ?? null,
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
  const playlistModule =
    home.modules.find((m) => m.module_type === "playlist") ?? null;

  // Performance Genre Filter
  const performanceGenreOptions = Array.from(
    new Set(
      (performanceItems ?? [])
        .map((it) => {
          const trackId = it.track_id;
          const genre = perfTrackMetaMap?.[trackId]?.genre ?? null;
          return genre && genre.trim() ? genre.trim() : "Unknown";
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const performanceItemsFiltered =
    performanceGenre === "all"
      ? performanceItems
      : performanceItems.filter((it) => {
          const trackId = it.track_id;
          const genre = perfTrackMetaMap?.[trackId]?.genre ?? "Unknown";
          const genreLower = (genre || "Unknown").toLowerCase().trim();
          return genreLower === performanceGenre.toLowerCase();
        });

  const devQueue = useMemo(() => {
    return devItems.slice(0, 20).map((it) => {
      const trackId = it.track_id;
      const title = it.title || "Untitled";
      const artist = it.artist_name ?? "—";
      const releaseId = it.release_id;

      const coverUrl = it.cover_path
        ? supabase.storage.from("release_covers").getPublicUrl(it.cover_path).data.publicUrl
        : null;

      const audioUrl = it.audio_path
        ? supabase.storage.from("tracks").getPublicUrl(it.audio_path).data.publicUrl
        : null;

      return {
        id: trackId,
        artist_id: it.artist_id,
        title,
        cover_url: coverUrl,
        audio_url: audioUrl,
        audio_path: it.audio_path ?? null,
        profiles: { display_name: artist },
        release_id: releaseId,
        release_track_id: it.release_track_id ?? null,
        rating_avg: it.rating_avg ?? null,
        rating_count: it.rating_count ?? 0,
        stream_count: it.stream_count ?? 0,
        my_stars: it.my_stars ?? null,
        bpm: it.bpm ?? null,
        key: it.key ?? null,
        // genre bleibt im UI-Slot über it.genre, nicht zwingend Teil von PlayerTrack
      } as unknown as PlayerTrack;
    });
  }, [devItems, supabase]);

  const perfQueue = useMemo(() => {
    return performanceItemsFiltered.map((it) => {
      const trackId = it.track_id;
      const title = it.track_title || "Untitled";
      const artistId = it.artist_id;
      const releaseId = it.release_id;

      const artistName = perfArtistMap[artistId] ?? "Unknown Artist";

      const coverUrl = it.release_cover_path
        ? supabase.storage.from("release_covers").getPublicUrl(it.release_cover_path).data.publicUrl
        : null;

      const audioPath = perfTrackMetaMap?.[trackId]?.audio_path ?? null;

      const audioUrl = audioPath
        ? supabase.storage.from("tracks").getPublicUrl(audioPath).data.publicUrl
        : null;

      const rtKey = `${releaseId}:${trackId}`;
      const rt = perfReleaseTrackMap[rtKey];

      return {
        id: trackId,
        artist_id: artistId,
        title,
        cover_url: coverUrl,
        audio_url: audioUrl,
        audio_path: audioPath,
        profiles: { display_name: artistName },
        release_id: releaseId,
        release_track_id: rt?.release_track_id ?? null,
        rating_avg: rt?.rating_avg ?? (it.rating_avg ?? null),
        rating_count: rt?.rating_count ?? (it.rating_count ?? 0),
        stream_count: rt?.stream_count ?? (it.streams_30d ?? 0),
        bpm: perfTrackMetaMap?.[trackId]?.bpm ?? null,
        key: perfTrackMetaMap?.[trackId]?.key ?? null,
      } as unknown as PlayerTrack;
    });
  }, [performanceItemsFiltered, perfArtistMap, perfReleaseTrackMap, perfTrackMetaMap, supabase]);

  return (
    <div className="space-y-6">
      {/* Ambient Hero (UI-only) */}
      <div
        className="
          relative overflow-hidden
          -mx-4 sm:-mx-6 lg:-mx-8
          px-4 sm:px-6 lg:px-8
          pt-10
          pb-12
        "
      >
        {/* Layer 1: Grundgradient */}
        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-gradient-to-r
            from-[#0B1614]
            via-[#0B1614]
            to-[#06212A]
          "
        />

        {/* Layer 2: Radial Glow (oben rechts, subtil) */}
        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-[radial-gradient(90%_140%_at_80%_15%,rgba(0,255,198,0.22),transparent_60%)]
          "
        />

        {/* Layer 3: LANGER Bottom-Fade in Home-Background */}
        <div
          aria-hidden="true"
          className="
            absolute inset-x-0 bottom-0
            h-40
            bg-gradient-to-b
            from-transparent
            via-[#0B0B0D]/70
            to-[#0B0B0D]
          "
        />

        {/* Content layer */}
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                Welcome back
              </div>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-white/90 leading-tight">
                Discover new music today
              </div>
              <div className="mt-1 text-sm text-white/50">
                Development for feedback • Performance for proven tracks
              </div>
            </div>

            {/* decorative badge */}
            <div className="shrink-0 hidden sm:flex items-center gap-2 rounded-full border border-[#00FFC622] bg-black/20 px-3 py-1.5 backdrop-blur">
              <span className="inline-block h-2 w-2 rounded-full bg-[#00FFC6] shadow-[0_0_12px_rgba(0,255,198,0.6)]" />
              <span className="text-xs text-white/75">IMUSIC Discovery</span>
            </div>
          </div>

          {/* Discovery Toggle */}
          <div className="mt-6 flex items-center justify-center">
            <div className="inline-flex rounded-full border border-[#00FFC622] bg-black/25 p-1 backdrop-blur shadow-[0_0_22px_rgba(0,255,198,0.10)]">
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
        </div>
      </div>

      {/* Development (EXAKT das bestehende Home) */}
      {discoveryMode === "development" ? (
        <div className="space-y-10 pb-[calc(env(safe-area-inset-bottom)+120px)]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {releaseModule?.title ?? "Releases"}
            </h2>

            {homeReleaseIds.length === 0 ? (
              <p className="text-white/40">No releases configured for Home yet.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
                {homeReleaseIds.slice(0, 10).map((rid) => {
                  const data = releasesById[rid] ?? null;
                  return (
                    <div key={rid} className="shrink-0 w-[150px] snap-start">
                      <ReleaseCard
                        releaseId={rid}
                        data={
                          data
                            ? ({
                                id: data.id,
                                title: data.title,
                                cover_url: data.cover_url ?? null,
                                release_type: data.release_type ?? null,
                                artist_id: data.artist_id ?? null,
                                artist_name: data.artist_name ?? null,
                              } satisfies ReleaseCardData)
                            : null
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {playlistModule?.title ?? "Playlists"}
            </h2>

            {homePlaylistIds.length === 0 ? (
              <p className="text-white/40">No playlists configured for Home yet.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
                {homePlaylistIds.slice(0, 10).map((pid) => {
                  const pl = playlistsById[pid];

                  if (!pl) {
                    return (
                      <div
                        key={pid}
                        className="shrink-0 w-[150px] snap-start bg-[#111112] p-3 rounded-xl border border-transparent"
                      >
                        <div className="w-full aspect-square rounded-xl bg-white/10" />
                        <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
                        <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
                      </div>
                    );
                  }

                  return (
                    <div key={pid} className="shrink-0 w-[150px] snap-start">
                      <PlaylistCard
                        id={pl.id}
                        title={pl.title}
                        description={pl.description}
                        cover_url={pl.cover_url}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Development Tracks</h2>
                <p className="text-sm text-white/50">
                  All tracks currently in Development Discovery.
                </p>
              </div>

              <div className="w-full md:w-[220px]">
                <label className="sr-only" htmlFor="dev-genre">Genre</label>
                <select
                  id="dev-genre"
                  value={devGenre}
                  onChange={(e) => setDevGenre(e.target.value)}
                  className="
                    w-full h-10 rounded-full px-4 text-sm
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
                {devQueue.map((rowTrack, idx) => {
                  const trackId = rowTrack.id;
                  const releaseId = rowTrack.release_id ?? null;
                  const title = rowTrack.title ?? "Untitled";
                  const artist = (rowTrack as any)?.profiles?.display_name ?? "—";
                  const coverUrl = rowTrack.cover_url ?? null;

                  return (
                    <TrackRowBase
                      key={trackId ?? `${idx}`}
                      track={rowTrack as any}
                      index={idx}
                      tracks={devQueue as any}
                      coverUrl={coverUrl}
                      coverSize="md"
                      // getQueue ENTFERNT (nur eine Queue-Quelle)
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
                        rowTrack.artist_id ? (
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => router.push(`/dashboard/artist/${rowTrack.artist_id}`)}
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
                        (rowTrack as any).release_track_id ? (
                          <TrackRatingInline
                            releaseTrackId={(rowTrack as any).release_track_id}
                            initialAvg={(rowTrack as any).rating_avg}
                            initialCount={(rowTrack as any).rating_count}
                            initialStreams={(rowTrack as any).stream_count}
                            initialMyStars={(rowTrack as any).my_stars}
                          />
                        ) : (
                          <span className="text-xs text-white/60">★</span>
                        )
                      }
                      bpmSlot={<span className="text-white/50 text-sm">{(rowTrack as any).bpm ?? "—"}</span>}
                      keySlot={<span className="text-white/50 text-sm">{(rowTrack as any).key ?? "—"}</span>}
                      genreSlot={<span className="text-white/50 text-sm">{(devItems[idx] as any)?.genre ?? "—"}</span>}
                      actionsSlot={
                        <TrackOptionsTrigger
                          track={rowTrack as any}
                          showGoToArtist={true}
                          showGoToRelease={true}
                          releaseId={releaseId ?? undefined}
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
        <div className="space-y-8">
          {/* Performance Releases (admin-curated) */}
          {performanceReleaseIds.length > 0 ? (
            <div className="space-y-4 pb-2">
              <h2 className="text-xl font-semibold">Performance Releases</h2>

              <div className="flex gap-4 overflow-x-auto pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
                {performanceReleaseIds.slice(0, 10).map((rid) => {
                  const data = releasesById[rid] ?? null;
                  return (
                    <div key={rid} className="shrink-0 w-[150px] snap-start">
                      <ReleaseCard
                        releaseId={rid}
                        data={
                          data
                            ? ({
                                id: data.id,
                                title: data.title,
                                cover_url: data.cover_url ?? null,
                                release_type: data.release_type ?? null,
                                artist_id: data.artist_id ?? null,
                                artist_name: data.artist_name ?? null,
                              } satisfies ReleaseCardData)
                            : null
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Performance Playlists (admin-curated only) */}
          {performancePlaylistIds.length > 0 ? (
            <div className="space-y-4 pb-2">
              <h2 className="text-xl font-semibold">Performance Playlists</h2>

              <div className="flex gap-4 overflow-x-auto pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
                {performancePlaylistIds.slice(0, 10).map((pid) => {
                  const pl = playlistsById[pid];

                  if (!pl) {
                    return (
                      <div
                        key={pid}
                        className="shrink-0 w-[150px] snap-start bg-[#111112] p-3 rounded-xl border border-transparent"
                      >
                        <div className="w-full aspect-square rounded-xl bg-white/10" />
                        <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
                        <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
                      </div>
                    );
                  }

                  return (
                    <div key={pid} className="shrink-0 w-[150px] snap-start">
                      <PlaylistCard
                        id={pl.id}
                        title={pl.title}
                        description={pl.description}
                        cover_url={pl.cover_url}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Performance Discovery (text must sit above tracks, not above releases) */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Performance Discovery</h2>
                <p className="text-sm text-white/50">
                  Tracks appear here once they have verified listener engagement and ratings.
                </p>
              </div>

              <div className="w-full md:w-[220px]">
                <label className="sr-only" htmlFor="perf-genre">Genre</label>
                <select
                  id="perf-genre"
                  value={performanceGenre}
                  onChange={(e) => setPerformanceGenre(e.target.value)}
                  className="
                    w-full h-10 rounded-full px-4 text-sm
                    bg-black/25 border border-white/10
                    text-white/80
                    focus:outline-none focus:ring-2 focus:ring-[#00FFC655]
                  "
                >
                  <option value="all">All genres</option>
                  {performanceGenreOptions.map((g) => (
                    <option key={g} value={g.toLowerCase()}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
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
              {perfQueue.map((rowTrack, idx) => {
                const trackId = rowTrack.id;
                const releaseId = rowTrack.release_id ?? null;
                const title = rowTrack.title ?? "Untitled";
                const artistName = (rowTrack as any)?.profiles?.display_name ?? "Unknown Artist";
                const coverUrl = rowTrack.cover_url ?? null;

                return (
                  <TrackRowBase
                    key={trackId ?? `${idx}`}
                    track={rowTrack as any}
                    index={idx}
                    tracks={perfQueue as any}
                    coverUrl={coverUrl}
                    coverSize="md"
                    // getQueue ENTFERNT (nur eine Queue-Quelle)
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
                      rowTrack.artist_id ? (
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => router.push(`/dashboard/artist/${rowTrack.artist_id}`)}
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
                      (rowTrack as any).release_track_id ? (
                        <TrackRatingInline
                          readOnly={true}
                          releaseTrackId={(rowTrack as any).release_track_id}
                          initialAvg={(rowTrack as any).rating_avg}
                          initialCount={(rowTrack as any).rating_count}
                          initialStreams={(rowTrack as any).stream_count}
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
                        releaseId={releaseId ?? undefined}
                      />
                    }
                    // coverOverlaySlot ENTFERNT (kein doppelter PlayOverlayButton)
                    bpmSlot={
                      <span className="text-white/50 text-sm tabular-nums">
                        {(rowTrack as any).bpm ?? "—"}
                      </span>
                    }
                    keySlot={
                      <span className="text-white/50 text-sm">
                        {(rowTrack as any).key ?? "—"}
                      </span>
                    }
                    genreSlot={
                      <span className="text-white/50 text-sm truncate">
                        {(perfTrackMetaMap as any)?.[trackId]?.genre ?? "—"}
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

