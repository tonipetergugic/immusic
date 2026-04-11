"use client";

import { useEffect, useRef, useState } from "react";
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

type PerformanceMetaResponse = {
  ok: boolean;
  error?: string;
  myStarsByTrackId?: Record<string, number | null>;
  listenStateByTrackId?: Record<
    string,
    {
      can_rate: boolean | null;
      listened_seconds: number | null;
    }
  >;
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
  fetchPerformanceDiscovery: (limit: number) => Promise<PerformanceDiscoveryItem[]>;
};

export function usePerformanceDiscovery({
  discoveryMode,
  isEnabled,
  isListener,
  viewerUserId,
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

          if (viewerUserId && trackIds.length > 0) {
            try {
              const metaRes = await fetch("/api/discovery/performance/meta", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                cache: "no-store",
                body: JSON.stringify({
                  trackIds,
                  includeListenState: isListener,
                }),
              });

              if (metaRes.ok) {
                const metaJson = (await metaRes.json()) as PerformanceMetaResponse;

                if (metaJson.ok) {
                  const myStarsRecord = metaJson.myStarsByTrackId ?? {};
                  const listenStateRecord = metaJson.listenStateByTrackId ?? {};

                  for (const [trackId, stars] of Object.entries(myStarsRecord)) {
                    if (typeof stars !== "number") continue;
                    myStarsByTrackId.set(String(trackId), stars);
                  }

                  for (const [trackId, listenState] of Object.entries(listenStateRecord)) {
                    listenStateByTrackId.set(String(trackId), {
                      can_rate:
                        typeof listenState?.can_rate === "boolean"
                          ? listenState.can_rate
                          : null,
                      listened_seconds:
                        typeof listenState?.listened_seconds === "number"
                          ? listenState.listened_seconds
                          : 0,
                    });
                  }
                }
              }
            } catch {
              // ignore meta errors so public performance feed still renders
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
  }, [discoveryMode, isEnabled, isListener, viewerUserId, fetchPerformanceDiscovery]);

  return {
    performanceItems,
    performanceLoading,
    performanceError,
    perfArtistMap,
    perfTrackStatsMap,
    perfTrackMetaMap,
  };
}
