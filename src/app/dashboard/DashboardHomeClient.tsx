// /Users/tonipetergugic/immusic/src/app/dashboard/DashboardHomeClient.tsx
"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchPerformanceDiscovery } from "@/lib/discovery/fetchPerformanceDiscovery.client";
import type { DevelopmentDiscoveryItem } from "@/lib/discovery/fetchDevelopmentDiscovery.client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerTrack } from "@/types/playerTrack";
import { useTrackArtistsMap } from "./_hooks/useTrackArtistsMap";
import { useDevelopmentDiscovery } from "./_hooks/useDevelopmentDiscovery";
import { usePerformanceDiscovery } from "./_hooks/usePerformanceDiscovery";
import { buildDevQueue, buildPerfQueue } from "./_lib/buildHomeQueues";
import {
  filterPerformanceItemsByGenre,
  getPerformanceGenreOptions,
} from "./_lib/performanceGenre";
import HomeReleasesSection from "./_components/HomeReleasesSection";
import HomePlaylistsSection from "./_components/HomePlaylistsSection";
import DevelopmentTracksSection from "./_components/DevelopmentTracksSection";
import PerformanceDiscoverySection from "./_components/PerformanceDiscoverySection";
import DashboardHeroAndToggle from "./_components/DashboardHeroAndToggle";
import type { DashboardHomeClientProps } from "./_types/dashboardHome.types";

export default function DashboardHomeClient({
  home,
  releasesById,
  playlistsById,
  homeReleaseIds,
  homePlaylistIds,
  performanceReleaseIds,
  performancePlaylistIds,
}: DashboardHomeClientProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [discoveryMode, setDiscoveryMode] = useState<"development" | "performance">("development");
  const [devGenre, setDevGenre] = useState<string>("all");
  const [performanceGenre, setPerformanceGenre] = useState<string>("all");

  const devCacheRef = useRef<Record<string, DevelopmentDiscoveryItem[]>>({});
  const devPromiseRef = useRef<Record<string, Promise<DevelopmentDiscoveryItem[]> | null>>({});
  const lastArtistsSigRef = useRef<string>("");

  const {
    devItems,
    devLoading,
    devError,
  } = useDevelopmentDiscovery({
    discoveryMode,
    devGenre,
    devCacheRef,
    devPromiseRef,
  });

  const {
    performanceItems,
    performanceLoading,
    performanceError,
    perfArtistMap,
    perfReleaseTrackMap,
    perfTrackMetaMap,
  } = usePerformanceDiscovery({
    discoveryMode,
    supabase,
    fetchPerformanceDiscovery,
  });

  const trackArtistsMap = useTrackArtistsMap({
    discoveryMode,
    devItems,
    performanceItems,
    supabase,
    lastArtistsSigRef,
  });

  // Releases section (from home_modules + home_module_items)
  const releaseModule = home.modules.find((m) => m.module_type === "release") ?? null;
  const playlistModule =
    home.modules.find((m) => m.module_type === "playlist") ?? null;

  // Performance Genre Filter
  const performanceGenreOptions = getPerformanceGenreOptions(
    performanceItems,
    perfTrackMetaMap
  );

  const performanceItemsFiltered = filterPerformanceItemsByGenre(
    performanceItems,
    performanceGenre,
    perfTrackMetaMap
  );

  const devQueue = useMemo(() => {
    return buildDevQueue({
      devItems,
      supabase,
      trackArtistsMap,
    }) as unknown as PlayerTrack[];
  }, [devItems, supabase, trackArtistsMap]);

  const perfQueue = useMemo(() => {
    return buildPerfQueue({
      performanceItemsFiltered,
      perfArtistMap,
      perfReleaseTrackMap,
      perfTrackMetaMap,
      supabase,
      trackArtistsMap,
    }) as unknown as PlayerTrack[];
  }, [performanceItemsFiltered, perfArtistMap, perfReleaseTrackMap, perfTrackMetaMap, supabase, trackArtistsMap]);

  return (
    <div className="space-y-6">
      <DashboardHeroAndToggle
        discoveryMode={discoveryMode}
        setDiscoveryMode={setDiscoveryMode}
      />

      {/* Development (EXAKT das bestehende Home) */}
      {discoveryMode === "development" ? (
        <div className="space-y-10 pb-[calc(env(safe-area-inset-bottom)+120px)]">
          <HomeReleasesSection
            title={releaseModule?.title ?? "Releases"}
            emptyText="No releases configured for Home yet."
            releaseIds={homeReleaseIds}
            releasesById={releasesById}
            showWhenEmpty={true}
            wrapperClassName="space-y-4"
          />

          <HomePlaylistsSection
            title={playlistModule?.title ?? "Playlists"}
            emptyText="No playlists configured for Home yet."
            playlistIds={homePlaylistIds}
            playlistsById={playlistsById}
            showWhenEmpty={true}
            wrapperClassName="space-y-4"
          />

          <DevelopmentTracksSection
            devGenre={devGenre}
            setDevGenre={setDevGenre}
            devItems={devItems}
            devLoading={devLoading}
            devError={devError}
            devQueue={devQueue}
            routerPush={(href) => router.push(href)}
          />
        </div>
      ) : (
        /* Performance (minimal list from performance_discovery_candidates via API) */
        <div className="space-y-8">
          {/* Performance Releases (admin-curated) */}
          <HomeReleasesSection
            title="Performance Releases"
            releaseIds={performanceReleaseIds}
            releasesById={releasesById}
            showWhenEmpty={false}
            wrapperClassName="space-y-4 pb-2"
          />

          {/* Performance Playlists (admin-curated only) */}
          <HomePlaylistsSection
            title="Performance Playlists"
            playlistIds={performancePlaylistIds}
            playlistsById={playlistsById}
            showWhenEmpty={false}
            wrapperClassName="space-y-4 pb-2"
          />

          <PerformanceDiscoverySection
            performanceGenre={performanceGenre}
            setPerformanceGenre={setPerformanceGenre}
            performanceGenreOptions={performanceGenreOptions}
            performanceLoading={performanceLoading}
            performanceError={performanceError}
            performanceItems={performanceItems}
            perfQueue={perfQueue}
            perfTrackMetaMap={perfTrackMetaMap}
            routerPush={(href) => router.push(href)}
          />
        </div>
      )}
    </div>
  );
}

