import DashboardHomeClient from "./DashboardHomeClient";
import { getHomeModules } from "@/lib/supabase/getHomeModules";
import { getHomeReleases, getLatestHomeReleaseIds } from "@/lib/supabase/getHomeReleases";
import { getHomePlaylists, getLatestHomePlaylistIds } from "@/lib/supabase/getHomePlaylists";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { modules, itemsByModuleId } = await getHomeModules();

  // Exclude releases that already have performance tracks (so Dev Home never shows them)
  const perfSupabase = await createSupabaseServerClient();

  const { data: perfRelRows, error: perfRelErr } = await perfSupabase
    .from("performance_discovery_candidates")
    .select("release_id");

  if (perfRelErr) {
    throw new Error(
      `performance_discovery_candidates query failed: ${perfRelErr.message} (${perfRelErr.code})`
    );
  }

  const performanceReleaseIdSet = new Set(
    (perfRelRows ?? [])
      .map((r: any) => r.release_id)
      .filter(Boolean)
  );

  // Map ist nicht serialisierbar -> in plain object umwandeln
  const obj: Record<string, any[]> = {};
  for (const [k, v] of itemsByModuleId.entries()) obj[k] = v;

  const releaseModule = modules.find((m: any) => m.module_type === "release") ?? null;
  const releaseItems = releaseModule ? (obj[releaseModule.id] ?? []) : [];

  const highlightedReleaseId =
    releaseItems
      .filter((it: any) => it.item_type === "release")
      .sort((a: any, b: any) => a.position - b.position)
      .map((it: any) => it.item_id)
      .find((id: any) => id && !performanceReleaseIdSet.has(id)) ?? null;

  const autoReleaseLimit = Math.max(0, 10 - (highlightedReleaseId ? 1 : 0));
  const autoReleaseIds =
    autoReleaseLimit > 0
      ? (await getLatestHomeReleaseIds({
          limit: autoReleaseLimit + performanceReleaseIdSet.size + (highlightedReleaseId ? 1 : 0),
          excludeIds: highlightedReleaseId ? [highlightedReleaseId] : [],
        })).filter((id) => !performanceReleaseIdSet.has(id)).slice(0, autoReleaseLimit)
      : [];

  const releaseIds = [
    ...(highlightedReleaseId ? [highlightedReleaseId] : []),
    ...autoReleaseIds,
  ];

  const performanceReleaseModule =
    modules.find((m: any) => m.module_type === "performance_release") ?? null;

  const performanceReleaseItems = performanceReleaseModule
    ? (obj[performanceReleaseModule.id] ?? [])
    : [];

  const performanceReleaseIds = Array.from(
    new Set(
      performanceReleaseItems
        .filter((it: any) => it.item_type === "release")
        .sort((a: any, b: any) => a.position - b.position)
        .slice(0, 10)
        .map((it: any) => it.item_id)
    )
  );

  const allReleaseIds = Array.from(new Set([...releaseIds, ...performanceReleaseIds]));
  const releasesById = await getHomeReleases(allReleaseIds);

  const playlistModule = modules.find((m: any) => m.module_type === "playlist") ?? null;
  const playlistItems = playlistModule ? (obj[playlistModule.id] ?? []) : [];

  const highlightedPlaylistId =
    playlistItems
      .filter((it: any) => it.item_type === "playlist")
      .sort((a: any, b: any) => a.position - b.position)
      .map((it: any) => it.item_id)
      .find(Boolean) ?? null;

  const playlistAutoLimit = Math.max(0, 10 - (highlightedPlaylistId ? 1 : 0));
  const autoPlaylistIds =
    playlistAutoLimit > 0
      ? await getLatestHomePlaylistIds({
          limit: playlistAutoLimit + (highlightedPlaylistId ? 1 : 0),
          excludeIds: highlightedPlaylistId ? [highlightedPlaylistId] : [],
        })
      : [];

  const playlistIds = [
    ...(highlightedPlaylistId ? [highlightedPlaylistId] : []),
    ...autoPlaylistIds,
  ];

  const performancePlaylistModule =
    modules.find((m: any) => m.module_type === "performance_playlist") ?? null;

  const performancePlaylistItems = performancePlaylistModule
    ? (obj[performancePlaylistModule.id] ?? [])
    : [];

  const highlightedPerformancePlaylistId =
    performancePlaylistItems
      .filter((it: any) => it.item_type === "playlist")
      .sort((a: any, b: any) => a.position - b.position)
      .map((it: any) => it.item_id)
      .find(Boolean) ?? null;

  const performancePlaylistAutoLimit = Math.max(
    0,
    10 - (highlightedPerformancePlaylistId ? 1 : 0)
  );

  const { data: performancePlaylistRows, error: performancePlaylistErr } =
    performancePlaylistAutoLimit > 0
      ? await perfSupabase
          .from("performance_discovery_eligible_playlists")
          .select("playlist_id")
          .order("created_at", { ascending: false })
          .limit(performancePlaylistAutoLimit + (highlightedPerformancePlaylistId ? 1 : 0))
      : { data: [], error: null };

  if (performancePlaylistErr) {
    throw new Error(
      `performance_discovery_eligible_playlists query failed: ${performancePlaylistErr.message} (${performancePlaylistErr.code})`
    );
  }

  const autoPerformancePlaylistIds = Array.from(
    new Set(
      (performancePlaylistRows ?? [])
        .map((r: any) => r.playlist_id)
        .filter((id: any) => Boolean(id) && id !== highlightedPerformancePlaylistId)
    )
  ).slice(0, performancePlaylistAutoLimit);

  const performancePlaylistIds = [
    ...(highlightedPerformancePlaylistId ? [highlightedPerformancePlaylistId] : []),
    ...autoPerformancePlaylistIds,
  ];

  // Dev Home must not show playlists that appear in Performance Home
  const performancePlaylistIdSet = new Set(performancePlaylistIds);
  const devPlaylistIds = playlistIds
    .filter((id) => !performancePlaylistIdSet.has(id))
    .slice(0, 10);

  // load all playlist cards (dev + perf) in one query
  const allPlaylistIds = Array.from(new Set([...devPlaylistIds, ...performancePlaylistIds]));
  const playlistsById = await getHomePlaylists(allPlaylistIds);

  // Ensure dev home only renders playlists that passed visibility filters (e.g. is_public=true)
  const devPlaylistIdsFiltered = devPlaylistIds.filter((id) => !!(playlistsById as any)?.[id]);

  return (
    <DashboardHomeClient
      home={{ modules, itemsByModuleId: obj }}
      releasesById={releasesById}
      playlistsById={playlistsById}
      homeReleaseIds={releaseIds}
      homePlaylistIds={devPlaylistIdsFiltered}
      performanceReleaseIds={performanceReleaseIds}
      performancePlaylistIds={performancePlaylistIds}
    />
  );
}
