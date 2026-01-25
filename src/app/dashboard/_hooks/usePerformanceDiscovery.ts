"use client";

import { useEffect, useRef, useState } from "react";

type Params = {
  discoveryMode: "development" | "performance";
  supabase: any;
  fetchPerformanceDiscovery: (limit: number) => Promise<any[]>;
};

export function usePerformanceDiscovery({
  discoveryMode,
  supabase,
  fetchPerformanceDiscovery,
}: Params) {
  const [performanceItems, setPerformanceItems] = useState<any[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);

  const [perfArtistMap, setPerfArtistMap] = useState<Record<string, string>>({});
  const [perfReleaseTrackMap, setPerfReleaseTrackMap] = useState<
    Record<
      string,
      {
        release_track_id: string;
        rating_avg: number | null;
        rating_count: number;
        stream_count: number;
      }
    >
  >({});
  const [perfTrackMetaMap, setPerfTrackMetaMap] = useState<
    Record<
      string,
      {
        bpm: number | null;
        key: string | null;
        genre: string | null;
        audio_path: string | null;
        version: string | null;
      }
    >
  >({});

  const perfCacheRef = useRef<any[] | null>(null);

  useEffect(() => {
    if (discoveryMode !== "performance") return;

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
          const artistIds = Array.from(new Set((items ?? []).map((x: any) => x.artist_id).filter(Boolean))) as string[];
          const trackIds = Array.from(new Set((items ?? []).map((x: any) => x.track_id).filter(Boolean))) as string[];
          const releaseIds = Array.from(new Set((items ?? []).map((x: any) => x.release_id).filter(Boolean))) as string[];

          // D) Track meta (bpm/key/genre)
          if (trackIds.length > 0) {
            const { data: tmeta, error: tmetaErr } = await supabase
              .from("tracks")
              .select("id, title, bpm, key, genre, audio_path, version")
              .in("id", trackIds);

            if (!tmetaErr && tmeta) {
              const m: Record<
                string,
                { bpm: number | null; key: string | null; genre: string | null; audio_path: string | null; version: string | null }
              > = {};
              for (const t of tmeta as any[]) {
                if (!t?.id) continue;
                m[t.id] = {
                  bpm: t.bpm ?? null,
                  key: t.key ?? null,
                  genre: t.genre ?? null,
                  audio_path: t.audio_path ?? null,
                  version: t.version ?? null,
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
              const map: Record<
                string,
                { release_track_id: string; rating_avg: number | null; rating_count: number; stream_count: number }
              > = {};
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
  }, [discoveryMode, supabase, fetchPerformanceDiscovery]);

  return {
    performanceItems,
    performanceLoading,
    performanceError,
    perfArtistMap,
    perfReleaseTrackMap,
    perfTrackMetaMap,
  };
}
