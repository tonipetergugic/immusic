import DashboardHomeClient from "./DashboardHomeClient";
import { getHomeModules } from "@/lib/supabase/getHomeModules";
import { getHomeReleases, getLatestHomeReleaseIds } from "@/lib/supabase/getHomeReleases";
import { getHomePlaylists, getLatestHomePlaylistIds } from "@/lib/supabase/getHomePlaylists";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HomeItem, HomeModule } from "./_types/dashboardHome.types";

type PerformanceCandidateRow = {
  release_id: string | null;
  score_v1: number | null;
  exposure_completed_at: string | null;
  track_id: string | null;
};

type ReleaseTrackStatusRow = {
  release_id: string | null;
  tracks:
    | { status: string | null }
    | { status: string | null }[]
    | null;
};

type PerformancePlaylistRow = {
  playlist_id: string | null;
};

export default async function DashboardPage() {
  const homeModulesPromise = getHomeModules();
  const perfSupabase = await createSupabaseServerClient();

  const [
    { modules: rawModules, itemsByModuleId },
    { data: perfRelRows, error: perfRelErr },
  ] = await Promise.all([
    homeModulesPromise,
    perfSupabase
      .from("performance_discovery_candidates")
      .select("release_id, score_v1, exposure_completed_at, track_id")
      .order("score_v1", { ascending: false })
      .order("exposure_completed_at", { ascending: true })
      .order("track_id", { ascending: true }),
  ]);

  const modules = rawModules as HomeModule[];

  const obj: Record<string, HomeItem[]> = {};
  for (const [k, v] of itemsByModuleId.entries()) {
    obj[k] = v as HomeItem[];
  }

  const releaseModule = modules.find((m) => m.module_type === "release") ?? null;
  const releaseItems = releaseModule ? (obj[releaseModule.id] ?? []) : [];

  const performanceReleaseModule =
    modules.find((m) => m.module_type === "performance_release") ?? null;

  const performanceReleaseItems = performanceReleaseModule
    ? (obj[performanceReleaseModule.id] ?? [])
    : [];

  if (perfRelErr) {
    throw new Error(
      `performance_discovery_candidates query failed: ${perfRelErr.message} (${perfRelErr.code})`
    );
  }

  const performanceCandidateRows = (perfRelRows ?? []) as PerformanceCandidateRow[];

  const candidatePerformanceReleaseIds = Array.from(
    new Set(
      performanceCandidateRows
        .map((r) => r.release_id)
        .filter((releaseId): releaseId is string => Boolean(releaseId))
    )
  );

  const highlightedPerformanceReleaseIds = Array.from(
    new Set(
      performanceReleaseItems
        .filter((it) => it.item_type === "release")
        .sort((a, b) => a.position - b.position)
        .map((it) => it.item_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const releaseIdsToInspect = Array.from(
    new Set([...candidatePerformanceReleaseIds, ...highlightedPerformanceReleaseIds])
  );

  const playlistModule = modules.find((m) => m.module_type === "playlist") ?? null;
  const playlistItems = playlistModule ? (obj[playlistModule.id] ?? []) : [];

  const highlightedPlaylistId =
    playlistItems
      .filter((it) => it.item_type === "playlist")
      .sort((a, b) => a.position - b.position)
      .map((it) => it.item_id)
      .find((id): id is string => Boolean(id)) ?? null;

  const playlistAutoLimit = Math.max(0, 10 - (highlightedPlaylistId ? 1 : 0));

  const performancePlaylistModule =
    modules.find((m) => m.module_type === "performance_playlist") ?? null;

  const performancePlaylistItems = performancePlaylistModule
    ? (obj[performancePlaylistModule.id] ?? [])
    : [];

  const highlightedPerformancePlaylistId =
    performancePlaylistItems
      .filter((it) => it.item_type === "playlist")
      .sort((a, b) => a.position - b.position)
      .map((it) => it.item_id)
      .find((id): id is string => Boolean(id)) ?? null;

  const performancePlaylistAutoLimit = Math.max(
    0,
    10 - (highlightedPerformancePlaylistId ? 1 : 0)
  );

  const [
    { data: releaseTrackRows, error: releaseTrackErr },
    autoPlaylistIds,
    { data: performancePlaylistRows, error: performancePlaylistErr },
  ] = await Promise.all([
    releaseIdsToInspect.length > 0
      ? perfSupabase
          .from("release_tracks")
          .select("release_id, tracks!inner(status)")
          .in("release_id", releaseIdsToInspect)
      : Promise.resolve({ data: [], error: null }),
    playlistAutoLimit > 0
      ? getLatestHomePlaylistIds({
          limit: playlistAutoLimit + (highlightedPlaylistId ? 1 : 0),
          excludeIds: highlightedPlaylistId ? [highlightedPlaylistId] : [],
        })
      : Promise.resolve([] as string[]),
    performancePlaylistAutoLimit > 0
      ? perfSupabase
          .from("performance_discovery_eligible_playlists")
          .select("playlist_id")
          .order("created_at", { ascending: false })
          .limit(performancePlaylistAutoLimit + (highlightedPerformancePlaylistId ? 1 : 0))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (releaseTrackErr) {
    throw new Error(
      `release_tracks query failed: ${releaseTrackErr.message} (${releaseTrackErr.code})`
    );
  }

  if (performancePlaylistErr) {
    throw new Error(
      `performance_discovery_eligible_playlists query failed: ${performancePlaylistErr.message} (${performancePlaylistErr.code})`
    );
  }

  const typedReleaseTrackRows = (releaseTrackRows ?? []) as ReleaseTrackStatusRow[];

  const trackStatusesByReleaseId: Record<string, string[]> = {};

  for (const row of typedReleaseTrackRows) {
    const releaseId = typeof row.release_id === "string" ? row.release_id : null;
    const trackRel = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
    const status = typeof trackRel?.status === "string" ? trackRel.status : null;

    if (!releaseId || !status) continue;

    if (!trackStatusesByReleaseId[releaseId]) {
      trackStatusesByReleaseId[releaseId] = [];
    }

    trackStatusesByReleaseId[releaseId].push(status);
  }

  function isPerformanceHomeRelease(statuses: string[]) {
    if (statuses.length === 0) return false;
    if (statuses.length === 1) return statuses[0] === "performance";
    return statuses.every((status) => status === "performance");
  }

  const performanceReleaseIdSet = new Set(
    releaseIdsToInspect.filter((releaseId) =>
      isPerformanceHomeRelease(trackStatusesByReleaseId[releaseId] ?? [])
    )
  );

  const highlightedReleaseId =
    releaseItems
      .filter((it) => it.item_type === "release")
      .sort((a, b) => a.position - b.position)
      .map((it) => it.item_id)
      .find((id): id is string => Boolean(id) && !performanceReleaseIdSet.has(id)) ?? null;

  const autoReleaseLimit = Math.max(0, 10 - (highlightedReleaseId ? 1 : 0));
  const autoReleaseIds =
    autoReleaseLimit > 0
      ? (await getLatestHomeReleaseIds({
          limit:
            autoReleaseLimit +
            performanceReleaseIdSet.size +
            (highlightedReleaseId ? 1 : 0),
          excludeIds: highlightedReleaseId ? [highlightedReleaseId] : [],
        }))
          .filter((id) => !performanceReleaseIdSet.has(id))
          .slice(0, autoReleaseLimit)
      : [];

  const releaseIds = [
    ...(highlightedReleaseId ? [highlightedReleaseId] : []),
    ...autoReleaseIds,
  ];

  const autoPerformanceReleaseIds = candidatePerformanceReleaseIds.filter((id) =>
    performanceReleaseIdSet.has(id)
  );

  const performanceReleaseIds = Array.from(
    new Set([
      ...highlightedPerformanceReleaseIds.filter((id) => performanceReleaseIdSet.has(id)),
      ...autoPerformanceReleaseIds,
    ])
  ).slice(0, 10);

  const allReleaseIds = Array.from(new Set([...releaseIds, ...performanceReleaseIds]));

  const playlistIds = [
    ...(highlightedPlaylistId ? [highlightedPlaylistId] : []),
    ...autoPlaylistIds,
  ];

  const typedPerformancePlaylistRows =
    (performancePlaylistRows ?? []) as PerformancePlaylistRow[];

  const autoPerformancePlaylistIds = Array.from(
    new Set(
      typedPerformancePlaylistRows
        .map((r) => r.playlist_id)
        .filter(
          (id): id is string => Boolean(id) && id !== highlightedPerformancePlaylistId
        )
    )
  ).slice(0, performancePlaylistAutoLimit);

  const performancePlaylistIds = [
    ...(highlightedPerformancePlaylistId ? [highlightedPerformancePlaylistId] : []),
    ...autoPerformancePlaylistIds,
  ];

  const performancePlaylistIdSet = new Set(performancePlaylistIds);
  const devPlaylistIds = playlistIds
    .filter((id) => !performancePlaylistIdSet.has(id))
    .slice(0, 10);

  const allPlaylistIds = Array.from(new Set([...devPlaylistIds, ...performancePlaylistIds]));

  const [releasesById, playlistsById] = await Promise.all([
    getHomeReleases(allReleaseIds),
    getHomePlaylists(allPlaylistIds),
  ]);

  const devPlaylistIdsFiltered = devPlaylistIds.filter((id) => Boolean(playlistsById[id]));

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
