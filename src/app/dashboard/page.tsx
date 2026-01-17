import DashboardHomeClient from "./DashboardHomeClient";
import { getHomeModules } from "@/lib/supabase/getHomeModules";
import { getHomeReleases } from "@/lib/supabase/getHomeReleases";
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

  const releaseIds = Array.from(
    new Set(
      releaseItems
        .filter((it: any) => it.item_type === "release")
        .sort((a: any, b: any) => a.position - b.position)
        .map((it: any) => it.item_id)
        // IMPORTANT: remove performance releases from Dev Home
        .filter((id: any) => !performanceReleaseIdSet.has(id))
        .slice(0, 10)
    )
  );

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

  const pinnedPlaylistIds = Array.from(
    new Set(
      playlistItems
        .filter((it: any) => it.item_type === "playlist")
        .sort((a: any, b: any) => a.position - b.position)
        .slice(0, 10)
        .map((it: any) => it.item_id)
    )
  );

  const playlistAutoLimit = Math.max(0, 10 - pinnedPlaylistIds.length);
  const autoPlaylistIds =
    playlistAutoLimit > 0
      ? await getLatestHomePlaylistIds({ limit: playlistAutoLimit, excludeIds: pinnedPlaylistIds })
      : [];

  const playlistIds = [...pinnedPlaylistIds, ...autoPlaylistIds];

  // ✅ Performance Playlists (admin-curated only, no auto-fill)
  const performancePlaylistModule =
    modules.find((m: any) => m.module_type === "performance_playlist") ?? null;

  const performancePlaylistItems = performancePlaylistModule
    ? (obj[performancePlaylistModule.id] ?? [])
    : [];

  const performancePlaylistIds = Array.from(
    new Set(
      performancePlaylistItems
        .filter((it: any) => it.item_type === "playlist")
        .sort((a: any, b: any) => a.position - b.position)
        .slice(0, 10)
        .map((it: any) => it.item_id)
    )
  );

  // Dev Home must not show playlists that are curated for Performance
  const performancePlaylistIdSet = new Set(performancePlaylistIds);
  const devPlaylistIds = playlistIds.filter((id) => !performancePlaylistIdSet.has(id));

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
