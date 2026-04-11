"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerformanceDiscoveryItem } from "@/lib/discovery/fetchPerformanceDiscovery.client";

type PerfTrackStats = {
  stream_count: number;
  my_stars: number | null;
  eligibility: {
    window_open: boolean | null;
    can_rate: boolean | null;
    listened_seconds: number | null;
  };
};

type MyRatingRow = {
  track_id: string;
  stars: number | null;
};

type ListenStateRow = {
  track_id: string;
  listened_seconds: number | null;
  can_rate: boolean | null;
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type Params = {
  discoveryMode: "development" | "performance";
  isEnabled: boolean;
  isListener: boolean;
  viewerUserId: string | null;
  supabase: SupabaseClient;
  fetchPerformanceDiscovery: (limit: number) => Promise<PerformanceDiscoveryItem[]>;
};

export function usePerformanceDiscovery({
  discoveryMode,
  isEnabled,
  isListener,
  viewerUserId,
  supabase,
  fetchPerformanceDiscovery,
}: Params) {
  const [performanceItems, setPerformanceItems] = useState<PerformanceDiscoveryItem[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);

  const [perfArtistMap, setPerfArtistMap] = useState<Record<string, string>>({});
  const [perfTrackStatsMap, setPerfTrackStatsMap] = useState<Record<string, PerfTrackStats>>({});
  const [perfTrackMetaMap, setPerfTrackMetaMap] = useState<
    Record<
      string,
      {
        bpm: number | null;
        key: string | null;
        genre: string | null;
        audio_path: string | null;
        version: string | null;
        is_explicit: boolean | null;
      }
    >
  >({});

  const perfCacheRef = useRef<PerformanceDiscoveryItem[] | null>(null);

  useEffect(() => {
    if (!isEnabled || discoveryMode !== "performance") return;

    let cancelled = false;

    if (perfCacheRef.current) {
      setPerformanceError(null);
      setPerformanceItems(perfCacheRef.current);
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      try {
        setPerformanceLoading(true);
        setPerformanceError(null);

        const items = await fetchPerformanceDiscovery(30);

        if (!cancelled) {
          perfCacheRef.current = items;
        }

        if (!cancelled) setPerformanceItems(items);

        try {
          const trackIds = Array.from(
            new Set(
              (items ?? [])
                .map((x) => x.track_id)
                .filter((id): id is string => Boolean(id))
            )
          );

          const artistMap: Record<string, string> = {};
          const publicStreamCountByTrackId: Record<string, number> = {};
          const trackMetaMap: Record<
            string,
            {
              bpm: number | null;
              key: string | null;
              genre: string | null;
              audio_path: string | null;
              version: string | null;
              is_explicit: boolean | null;
            }
          > = {};

          for (const item of items ?? []) {
            if (item.artist_id && item.artist_name) {
              artistMap[item.artist_id] = item.artist_name;
            }

            if (item.track_id) {
              publicStreamCountByTrackId[item.track_id] =
                typeof item.streams_lifetime === "number" ? item.streams_lifetime : 0;

              trackMetaMap[item.track_id] = {
                bpm: item.bpm ?? null,
                key: item.key ?? null,
                genre: item.genre ?? null,
                audio_path: item.audio_path ?? null,
                version: item.version ?? null,
                is_explicit: item.is_explicit ?? null,
              };
            }
          }

          if (!cancelled) {
            setPerfArtistMap(artistMap);
            setPerfTrackMetaMap(trackMetaMap);
          }

          const myStarsByTrackId = new Map<string, number>();
          const listenStateByTrackId = new Map<
            string,
            { can_rate: boolean | null; listened_seconds: number | null }
          >();

          if (viewerUserId) {
            const [{ data: myRatings, error: myRatingsErr }, { data: listenRows, error: listenErr }] =
              await Promise.all([
                trackIds.length > 0
                  ? supabase
                      .from("track_ratings")
                      .select("track_id, stars")
                      .eq("user_id", viewerUserId)
                      .in("track_id", trackIds)
                  : Promise.resolve({ data: [], error: null }),
                trackIds.length > 0 && isListener
                  ? supabase
                      .from("track_listen_state")
                      .select("track_id, listened_seconds, can_rate")
                      .eq("user_id", viewerUserId)
                      .in("track_id", trackIds)
                  : Promise.resolve({ data: [], error: null }),
              ]);

            if (!myRatingsErr && myRatings) {
              for (const row of (myRatings ?? []) as MyRatingRow[]) {
                if (!row?.track_id || typeof row.stars !== "number") continue;
                myStarsByTrackId.set(String(row.track_id), row.stars);
              }
            }

            if (!listenErr && listenRows) {
              for (const row of (listenRows ?? []) as ListenStateRow[]) {
                if (!row?.track_id) continue;

                listenStateByTrackId.set(String(row.track_id), {
                  can_rate: typeof row.can_rate === "boolean" ? row.can_rate : null,
                  listened_seconds:
                    typeof row.listened_seconds === "number" ? row.listened_seconds : 0,
                });
              }
            }
          }

          if (trackIds.length > 0) {
            const map: Record<string, PerfTrackStats> = {};

            for (const trackId of trackIds) {
              const listenState = listenStateByTrackId.get(String(trackId));

              map[trackId] = {
                stream_count: publicStreamCountByTrackId[String(trackId)] ?? 0,
                my_stars: myStarsByTrackId.get(String(trackId)) ?? null,
                eligibility: {
                  window_open: true,
                  can_rate: isListener ? (listenState?.can_rate ?? false) : false,
                  listened_seconds: isListener ? (listenState?.listened_seconds ?? 0) : 0,
                },
              };
            }

            if (!cancelled) setPerfTrackStatsMap(map);
          }
        } catch (e) {
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setPerformanceError(getErrorMessage(err, "Failed to load performance candidates"));
        }
      } finally {
        if (!cancelled) setPerformanceLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [discoveryMode, isEnabled, isListener, viewerUserId, supabase, fetchPerformanceDiscovery]);

  return {
    performanceItems,
    performanceLoading,
    performanceError,
    perfArtistMap,
    perfTrackStatsMap,
    perfTrackMetaMap,
  };
}

