"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Artist = { id: string; display_name: string };

type DiscoverySourceItem = {
  track_id?: string | null;
};

type TrackArtistsResolvedRow = {
  track_id: string | null;
  artists:
    | {
        id: string | null;
        display_name: string | null;
      }[]
    | null;
};

type Params = {
  discoveryMode: "development" | "performance";
  devItems: DiscoverySourceItem[];
  performanceItems: DiscoverySourceItem[];
  supabase: SupabaseClient;
  lastArtistsSigRef: MutableRefObject<string>;
};

export function useTrackArtistsMap({
  discoveryMode,
  devItems,
  performanceItems,
  supabase,
  lastArtistsSigRef,
}: Params) {
  const [trackArtistsMap, setTrackArtistsMap] = useState<Record<string, Artist[]>>({});

  useEffect(() => {
    if (discoveryMode !== "performance") {
      return;
    }

    const sourceItems = performanceItems ?? [];

    const trackIds = Array.from(
      new Set(
        sourceItems
          .map((item) => item.track_id)
          .filter((trackId): trackId is string => Boolean(trackId))
      )
    );
    if (trackIds.length === 0) return;

    const sig = `${discoveryMode}:${[...trackIds].sort().join("|")}`;
    if (sig === lastArtistsSigRef.current) return;
    lastArtistsSigRef.current = sig;

    let cancelled = false;

    async function loadTrackArtists() {
      try {
        const { data, error } = await supabase
          .from("track_artists_resolved")
          .select("track_id, artists")
          .in("track_id", trackIds);

        if (error) return;
        if (!data) return;

        const map: Record<string, Artist[]> = {};

        for (const row of (data ?? []) as TrackArtistsResolvedRow[]) {
          const trackId = String(row.track_id ?? "");
          if (!trackId) continue;

          const artists = Array.isArray(row.artists)
            ? row.artists
                .map((artist) => {
                  const artistId = String(artist?.id ?? "");
                  if (!artistId) return null;

                  return {
                    id: artistId,
                    display_name: String(
                      artist?.display_name ?? "Unknown Artist"
                    ),
                  };
                })
                .filter((artist): artist is Artist => artist !== null)
            : [];

          map[trackId] = artists;
        }

        if (!cancelled) setTrackArtistsMap(map);
      } catch {
      }
    }

    loadTrackArtists();

    return () => {
      cancelled = true;
    };
  }, [discoveryMode, devItems, performanceItems, supabase]);

  return trackArtistsMap;
}
