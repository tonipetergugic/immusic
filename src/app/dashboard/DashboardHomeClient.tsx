"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchPerformanceDiscovery } from "@/lib/discovery/fetchPerformanceDiscovery.client";
import type { DevelopmentDiscoveryItem } from "@/lib/discovery/fetchDevelopmentDiscovery.client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerTrack } from "@/types/playerTrack";
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
    perfTrackStatsMap,
    perfTrackMetaMap,
  } = usePerformanceDiscovery({
    discoveryMode,
    supabase,
    fetchPerformanceDiscovery,
  });

  useEffect(() => {
    if (!tabFocusRef.current) return;

    const target = document.getElementById(`home-tab-${tabFocusRef.current}`);
    if (target instanceof HTMLButtonElement) {
      target.focus();
    }

    tabFocusRef.current = null;
  }, [homeTab]);

  const releaseModule = home.modules.find((m) => m.module_type === "release") ?? null;
  const playlistModule =
    home.modules.find((m) => m.module_type === "playlist") ?? null;

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
    }) as unknown as PlayerTrack[];
  }, [devItems, supabase]);

  const perfQueue = useMemo(() => {
    return buildPerfQueue({
      performanceItemsFiltered,
      perfArtistMap,
      perfTrackStatsMap,
      perfTrackMetaMap,
      supabase,
    }) as unknown as PlayerTrack[];
  }, [performanceItemsFiltered, perfArtistMap, perfTrackStatsMap, perfTrackMetaMap, supabase]);

  const HomeTabs = (
    <div className="border-b border-white/5 pb-2">
      <nav
        role="tablist"
        aria-label="Home sections"
        className="grid grid-cols-3 gap-2 sm:gap-3 md:flex md:w-auto md:min-w-0 md:gap-6"
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
              className={`min-h-[44px] rounded-full border px-4 py-2.5 text-[15px] font-medium transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/40 md:min-h-0 md:rounded-none md:border-x-0 md:border-t-0 md:border-b-2 md:bg-transparent md:px-0 md:py-2 md:pb-3 md:text-sm ${
                isActive
                  ? "border-[#00FFC633] bg-[#111112] text-white shadow-[0_0_18px_rgba(0,255,198,0.08)] md:border-[#00FFC6] md:bg-transparent md:shadow-none"
                  : "border-white/8 bg-white/[0.02] text-neutral-300 hover:text-white hover:border-white/12 md:border-transparent md:bg-transparent"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  const tabPanelClassName = "space-y-8 pt-3 pb-[calc(env(safe-area-inset-bottom)+120px)] sm:space-y-10";

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeroAndToggle
        discoveryMode={discoveryMode}
        setDiscoveryMode={setDiscoveryMode}
      />

      {HomeTabs}

      <div
        role="tabpanel"
        aria-labelledby={`home-tab-${homeTab}`}
        className={tabPanelClassName}
      >
        {discoveryMode === "development" && homeTab === "releases" ? (
          <HomeReleasesSection
            title={releaseModule?.title ?? "Releases"}
            emptyText="No releases configured for Home yet."
            releaseIds={homeReleaseIds}
            releasesById={releasesById}
            showWhenEmpty={true}
            wrapperClassName="space-y-4"
          />
        ) : null}

        {discoveryMode === "development" && homeTab === "playlists" ? (
          <HomePlaylistsSection
            title={playlistModule?.title ?? "Featured Playlists"}
            emptyText="No playlists configured for Home yet."
            playlistIds={homePlaylistIds}
            playlistsById={playlistsById}
            showWhenEmpty={true}
            wrapperClassName="space-y-4"
          />
        ) : null}

        {discoveryMode === "development" && homeTab === "tracks" ? (
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

        {discoveryMode === "performance" && homeTab === "releases" ? (
          <HomeReleasesSection
            title="Performance Releases"
            releaseIds={performanceReleaseIds}
            releasesById={releasesById}
            showWhenEmpty={false}
            wrapperClassName="space-y-4 pb-2"
          />
        ) : null}

        {discoveryMode === "performance" && homeTab === "playlists" ? (
          <HomePlaylistsSection
            title="Performance Playlists"
            subtitle="Selected performance playlists — featuring the strongest, newest, or highlighted playlists made only from performance tracks."
            playlistIds={performancePlaylistIds}
            playlistsById={playlistsById}
            showWhenEmpty={false}
            wrapperClassName="space-y-4 pb-2"
          />
        ) : null}

        {discoveryMode === "performance" && homeTab === "tracks" ? (
          <PerformanceDiscoverySection
            performanceGenre={performanceGenre}
            setPerformanceGenre={setPerformanceGenre}
            performanceGenreOptions={performanceGenreOptions}
            performanceLoading={performanceLoading}
            performanceError={performanceError}
            performanceItems={performanceItems}
            perfQueue={perfQueue}
            perfTrackMetaMap={perfTrackMetaMap}
            perfTrackStatsMap={perfTrackStatsMap}
            routerPush={(href) => router.push(href)}
          />
        ) : null}
      </div>
    </div>
  );
}

