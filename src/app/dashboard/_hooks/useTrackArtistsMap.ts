"use client";

import React, { useEffect, useState } from "react";

type Artist = { id: string; display_name: string };

type Params = {
  discoveryMode: "development" | "performance";
  devItems: any[];
  performanceItems: any[];
  supabase: any;
  lastArtistsSigRef: React.MutableRefObject<string>;
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
    const sourceItems = discoveryMode === "performance" ? (performanceItems ?? []) : (devItems ?? []);
    const trackIds = Array.from(new Set(sourceItems.map((x: any) => x?.track_id).filter(Boolean))) as string[];
    if (trackIds.length === 0) return;

    const sig = `${discoveryMode}:${[...trackIds].sort().join("|")}`;
    if (sig === lastArtistsSigRef.current) return;
    lastArtistsSigRef.current = sig;

    let cancelled = false;

    async function loadTrackArtists() {
      try {
        const { data, error } = await supabase
          .from("track_collaborators")
          .select(
            `
            track_id,
            role,
            position,
            profiles:profiles!track_collaborators_profile_id_fkey (
              id,
              display_name
            )
          `
          )
          .in("track_id", trackIds)
          .order("position", { ascending: true });

        if (error) return;
        if (!data) return;

        const map: Record<string, Artist[]> = {};

        for (const row of data as any[]) {
          const trackId = row?.track_id;
          const p = row?.profiles;
          if (!trackId || !p?.id) continue;

          if (!map[trackId]) map[trackId] = [];

          if (!map[trackId].some((a) => a.id === String(p.id))) {
            map[trackId].push({
              id: String(p.id),
              display_name: String(p.display_name ?? "Unknown Artist"),
            });
          }
        }

        if (!cancelled) setTrackArtistsMap(map);
      } catch {
        // ignore: UI fallback to single artist
      }
    }

    loadTrackArtists();

    return () => {
      cancelled = true;
    };
  }, [discoveryMode, devItems, performanceItems, supabase]);

  return trackArtistsMap;
}
