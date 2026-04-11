import DashboardHomeClient from "./DashboardHomeClient";
import { getHomeModules } from "@/lib/supabase/getHomeModules";
import { getHomeReleases, getLatestHomeReleaseIds } from "@/lib/supabase/getHomeReleases";
import { getHomePlaylists, getLatestHomePlaylistIds } from "@/lib/supabase/getHomePlaylists";
import type { HomeItem, HomeModule } from "./_types/dashboardHome.types";

export default async function DashboardPage() {
  const { modules: rawModules, itemsByModuleId } = await getHomeModules();

  const modules = rawModules as HomeModule[];

  const obj: Record<string, HomeItem[]> = {};
  for (const [k, v] of itemsByModuleId.entries()) {
    obj[k] = v as HomeItem[];
  }

  const releaseModule = modules.find((m) => m.module_type === "release") ?? null;
  const releaseItems = releaseModule ? (obj[releaseModule.id] ?? []) : [];

  const highlightedReleaseId =
    releaseItems
      .filter((it) => it.item_type === "release")
      .sort((a, b) => a.position - b.position)
      .map((it) => it.item_id)
      .find((id): id is string => Boolean(id)) ?? null;

  const autoReleaseLimit = Math.max(0, 10 - (highlightedReleaseId ? 1 : 0));

  const autoReleaseIds =
    autoReleaseLimit > 0
      ? await getLatestHomeReleaseIds({
          limit: autoReleaseLimit,
          excludeIds: highlightedReleaseId ? [highlightedReleaseId] : [],
        })
      : [];

  const releaseIds = [
    ...(highlightedReleaseId ? [highlightedReleaseId] : []),
    ...autoReleaseIds,
  ];

  const playlistModule = modules.find((m) => m.module_type === "playlist") ?? null;
  const playlistItems = playlistModule ? (obj[playlistModule.id] ?? []) : [];

  const highlightedPlaylistId =
    playlistItems
      .filter((it) => it.item_type === "playlist")
      .sort((a, b) => a.position - b.position)
      .map((it) => it.item_id)
      .find((id): id is string => Boolean(id)) ?? null;

  const playlistAutoLimit = Math.max(0, 10 - (highlightedPlaylistId ? 1 : 0));

  const autoPlaylistIds =
    playlistAutoLimit > 0
      ? await getLatestHomePlaylistIds({
          limit: playlistAutoLimit,
          excludeIds: highlightedPlaylistId ? [highlightedPlaylistId] : [],
        })
      : [];

  const devPlaylistIds = [
    ...(highlightedPlaylistId ? [highlightedPlaylistId] : []),
    ...autoPlaylistIds,
  ];

  const [releasesById, playlistsById] = await Promise.all([
    getHomeReleases(releaseIds),
    getHomePlaylists(devPlaylistIds),
  ]);

  const devPlaylistIdsFiltered = devPlaylistIds.filter((id) => Boolean(playlistsById[id]));

  return (
    <DashboardHomeClient
      home={{ modules, itemsByModuleId: obj }}
      releasesById={releasesById}
      playlistsById={playlistsById}
      homeReleaseIds={releaseIds}
      homePlaylistIds={devPlaylistIdsFiltered}
    />
  );
}
