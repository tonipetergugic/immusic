"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Artist = { id: string; display_name: string };

type DiscoverySourceItem = {
  track_id?: string | null;
};

type CollaboratorRow = {
  track_id: string | null;
  role: string | null;
  position: number | null;
  profiles:
    | {
        id: string | null;
        display_name: string | null;
      }
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
    const sourceItems =
      discoveryMode === "performance" ? performanceItems ?? [] : devItems ?? [];

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

        for (const row of (data ?? []) as CollaboratorRow[]) {
          const trackId = row.track_id;
          const profile = Array.isArray(row.profiles)
            ? (row.profiles[0] ?? null)
            : (row.profiles ?? null);

          if (!trackId || !profile?.id) continue;

          if (!map[trackId]) map[trackId] = [];

          if (!map[trackId].some((artist) => artist.id === String(profile.id))) {
            map[trackId].push({
              id: String(profile.id),
              display_name: String(profile.display_name ?? "Unknown Artist"),
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
