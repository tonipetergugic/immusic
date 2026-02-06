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
  const [homeTab, setHomeTab] = useState<"releases" | "playlists" | "tracks">("releases");
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

  const HomeTabs = (
    <div className="border-b border-white/5">
      <nav className="flex gap-6 text-sm">
        {[
          { key: "releases", label: "Releases" },
          { key: "playlists", label: "Playlists" },
          { key: "tracks", label: "Tracks" },
        ].map((t) => {
          const isActive = homeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setHomeTab(t.key as any)}
              className={`pb-3 transition-colors ${
                isActive
                  ? "text-white font-medium border-b-2 border-[#00FFC6]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="space-y-6">
      <DashboardHeroAndToggle
        discoveryMode={discoveryMode}
        setDiscoveryMode={setDiscoveryMode}
      />

      {/* Development (EXAKT das bestehende Home) */}
      {discoveryMode === "development" ? (
        <div className="space-y-10 pb-[calc(env(safe-area-inset-bottom)+120px)]">
          {HomeTabs}

          {homeTab === "releases" ? (
            <HomeReleasesSection
              title={releaseModule?.title ?? "Releases"}
              emptyText="No releases configured for Home yet."
              releaseIds={homeReleaseIds}
              releasesById={releasesById}
              showWhenEmpty={true}
              wrapperClassName="space-y-4"
            />
          ) : null}

          {homeTab === "playlists" ? (
            <HomePlaylistsSection
              title={playlistModule?.title ?? "Featured Playlists"}
              emptyText="No playlists configured for Home yet."
              playlistIds={homePlaylistIds}
              playlistsById={playlistsById}
              showWhenEmpty={true}
              wrapperClassName="space-y-4"
            />
          ) : null}

          {homeTab === "tracks" ? (
            <DevelopmentTracksSection
              devGenre={devGenre}
              setDevGenre={setDevGenre}
              devItems={devItems}
              devLoading={devLoading}
              devError={devError}
              devQueue={devQueue}
              routerPush={(href) => router.push(href)}
            />
          ) : null}
        </div>
      ) : (
        /* Performance (minimal list from performance_discovery_candidates via API) */
        <div className="space-y-8">
          {HomeTabs}

          {homeTab === "releases" ? (
            <HomeReleasesSection
              title="Performance Releases"
              releaseIds={performanceReleaseIds}
              releasesById={releasesById}
              showWhenEmpty={false}
              wrapperClassName="space-y-4 pb-2"
            />
          ) : null}

          {homeTab === "playlists" ? (
            <HomePlaylistsSection
              title="Performance Playlists"
              playlistIds={performancePlaylistIds}
              playlistsById={playlistsById}
              showWhenEmpty={false}
              wrapperClassName="space-y-4 pb-2"
            />
          ) : null}

          {homeTab === "tracks" ? (
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
          ) : null}
        </div>
      )}
    </div>
  );
}

