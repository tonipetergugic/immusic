// /Users/tonipetergugic/immusic/src/app/dashboard/DashboardHomeClient.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  const [homeTab, setHomeTab] = useState<HomeTabKey>("releases");
  const [devGenre, setDevGenre] = useState<string>("all");
  const [performanceGenre, setPerformanceGenre] = useState<string>("all");
  const tabFocusRef = useRef<HomeTabKey | null>(null);

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

  useEffect(() => {
    if (!tabFocusRef.current) return;

    const target = document.getElementById(`home-tab-${tabFocusRef.current}`);
    if (target instanceof HTMLButtonElement) {
      target.focus();
    }

    tabFocusRef.current = null;
  }, [homeTab]);

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

  type HomeTabKey = "releases" | "playlists" | "tracks";
  const HOME_TABS: { key: HomeTabKey; label: string }[] = [
    { key: "releases", label: "Releases" },
    { key: "playlists", label: "Playlists" },
    { key: "tracks", label: "Tracks" },
  ];
  function getNextHomeTabKey(
    current: HomeTabKey,
    direction: "left" | "right"
  ): HomeTabKey {
    const currentIndex = HOME_TABS.findIndex((tab) => tab.key === current);
    if (currentIndex === -1) return "releases";

    if (direction === "right") {
      return HOME_TABS[(currentIndex + 1) % HOME_TABS.length].key;
    }

    return HOME_TABS[(currentIndex - 1 + HOME_TABS.length) % HOME_TABS.length].key;
  }

  const HomeTabs = (
    <div className="relative border-b border-white/5 pb-1">
      <div className="overflow-x-auto">
        <nav
          role="tablist"
          aria-label="Home sections"
          className="flex w-max min-w-full gap-6 text-sm whitespace-nowrap"
        >
        {HOME_TABS.map((t) => {
          const isActive = homeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              id={`home-tab-${t.key}`}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  const nextTab = getNextHomeTabKey(homeTab, "right");
                  tabFocusRef.current = nextTab;
                  setHomeTab(nextTab);
                }

                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const nextTab = getNextHomeTabKey(homeTab, "left");
                  tabFocusRef.current = nextTab;
                  setHomeTab(nextTab);
                }

                if (e.key === "Home") {
                  e.preventDefault();
                  const nextTab = HOME_TABS[0].key;
                  tabFocusRef.current = nextTab;
                  setHomeTab(nextTab);
                }

                if (e.key === "End") {
                  e.preventDefault();
                  const nextTab = HOME_TABS[HOME_TABS.length - 1].key;
                  tabFocusRef.current = nextTab;
                  setHomeTab(nextTab);
                }
              }}
              onClick={() => setHomeTab(t.key)}
              className={`py-2 pb-3 border-b-2 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:text-white ${
                isActive
                  ? "text-white font-medium border-[#00FFC6]"
                  : "text-neutral-400 border-transparent hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
        </nav>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0E0E10] to-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <DashboardHeroAndToggle
        discoveryMode={discoveryMode}
        setDiscoveryMode={setDiscoveryMode}
      />

      {HomeTabs}

      {discoveryMode === "development" ? (
        <div
          role="tabpanel"
          aria-labelledby={`home-tab-${homeTab}`}
          className="space-y-10 pt-2 pb-[calc(env(safe-area-inset-bottom)+120px)]"
        >
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
        <div
          role="tabpanel"
          aria-labelledby={`home-tab-${homeTab}`}
          className="space-y-10 pt-2 pb-[calc(env(safe-area-inset-bottom)+120px)]"
        >
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
              subtitle="Selected performance playlists — featuring the strongest, newest, or highlighted playlists made only from performance tracks."
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

