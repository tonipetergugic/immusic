import { NextResponse } from "next/server";
import { getHomeModules } from "@/lib/supabase/getHomeModules";
import { getHomeReleases } from "@/lib/supabase/getHomeReleases";
import { getHomePlaylists } from "@/lib/supabase/getHomePlaylists";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HomeItem, HomeModule } from "@/app/dashboard/_types/dashboardHome.types";

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

export async function GET() {
  try {
    const homeModulesPromise = getHomeModules();
    const supabase = await createSupabaseServerClient();

    const [
      { modules: rawModules, itemsByModuleId },
      { data: perfRelRows, error: perfRelErr },
    ] = await Promise.all([
      homeModulesPromise,
      supabase
        .from("performance_discovery_candidates")
        .select("release_id, score_v1, exposure_completed_at, track_id")
        .order("score_v1", { ascending: false })
        .order("exposure_completed_at", { ascending: true })
        .order("track_id", { ascending: true }),
    ]);

    if (perfRelErr) {
      return NextResponse.json(
        { ok: false, error: `performance_discovery_candidates query failed: ${perfRelErr.message}` },
        { status: 500 }
      );
    }

    const modules = rawModules as HomeModule[];

    const performanceReleaseModule =
      modules.find((m) => m.module_type === "performance_release") ?? null;

    const performanceReleaseItems = performanceReleaseModule
      ? ((itemsByModuleId.get(performanceReleaseModule.id) ?? []) as HomeItem[])
      : [];

    const performancePlaylistModule =
      modules.find((m) => m.module_type === "performance_playlist") ?? null;

    const performancePlaylistItems = performancePlaylistModule
      ? ((itemsByModuleId.get(performancePlaylistModule.id) ?? []) as HomeItem[])
      : [];

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
      { data: performancePlaylistRows, error: performancePlaylistErr },
    ] = await Promise.all([
      releaseIdsToInspect.length > 0
        ? supabase
            .from("release_tracks")
            .select("release_id, tracks!inner(status)")
            .in("release_id", releaseIdsToInspect)
        : Promise.resolve({ data: [], error: null }),
      performancePlaylistAutoLimit > 0
        ? supabase
            .from("performance_discovery_eligible_playlists")
            .select("playlist_id")
            .order("created_at", { ascending: false })
            .limit(performancePlaylistAutoLimit + (highlightedPerformancePlaylistId ? 1 : 0))
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (releaseTrackErr) {
      return NextResponse.json(
        { ok: false, error: `release_tracks query failed: ${releaseTrackErr.message}` },
        { status: 500 }
      );
    }

    if (performancePlaylistErr) {
      return NextResponse.json(
        {
          ok: false,
          error: `performance_discovery_eligible_playlists query failed: ${performancePlaylistErr.message}`,
        },
        { status: 500 }
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

    const autoPerformanceReleaseIds = candidatePerformanceReleaseIds.filter((id) =>
      performanceReleaseIdSet.has(id)
    );

    const performanceReleaseIds = Array.from(
      new Set([
        ...highlightedPerformanceReleaseIds.filter((id) => performanceReleaseIdSet.has(id)),
        ...autoPerformanceReleaseIds,
      ])
    ).slice(0, 10);

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

    const [releasesById, playlistsById] = await Promise.all([
      getHomeReleases(performanceReleaseIds),
      getHomePlaylists(performancePlaylistIds),
    ]);

    return NextResponse.json({
      ok: true,
      releasesById,
      playlistsById,
      performanceReleaseIds,
      performancePlaylistIds,
    });
  } catch (error) {
    console.error("performance-home route error", error);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
