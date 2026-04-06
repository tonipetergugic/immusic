import "server-only";

import { getArtistAnalyticsSummary, type AnalyticsRange } from "@/lib/analytics/getArtistAnalytics.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Range } from "../types";
import type { ValidListenRow } from "./analyticsRows";
import { getArtistTrackIds } from "./getArtistTrackIds.server";

export type OverviewTabData = {
  summary: Awaited<ReturnType<typeof getArtistAnalyticsSummary>>;
  followersCount: number;
  savesCount: number;
  conversionPct: number;
};

function rangeToDays(r: Range): number | null {
  if (r === "7d") return 7;
  if (r === "28d") return 28;
  if (r === "all") return null;
  return 28;
}

export async function getOverviewTabData(args: {
  artistId: string;
  range: Range;
}): Promise<OverviewTabData> {
  const { artistId, range } = args;

  const summary = await getArtistAnalyticsSummary({
    artistId,
    range: range as AnalyticsRange,
  });

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  const days = rangeToDays(range);

  // Followers (live) — how many profiles follow this artist
  const { count: followersCount, error: followersErr } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", artistId);

  if (followersErr) throw new Error(followersErr.message);

  // Saves (live) — how many times tracks of this artist are in user libraries
  const trackIds = await getArtistTrackIds(artistId);

  let savesCount = 0;
  const savesByTrack = new Map<string, number>();

  if (trackIds.length > 0) {
    let savesQuery = supabaseAdmin
      .from("library_tracks")
      .select("track_id")
      .in("track_id", trackIds)
      .neq("user_id", artistId);

    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromISO = from.toISOString().slice(0, 10);
      savesQuery = savesQuery.gte("created_at", `${fromISO}T00:00:00.000Z`);
    }

    const { data: saveRows, error: savesErr } = await savesQuery;

    if (savesErr) throw new Error(savesErr.message);

    ((saveRows || []) as { track_id: string | null }[]).forEach((row) => {
      const tid = row.track_id ? String(row.track_id) : null;
      if (!tid) return;
      savesByTrack.set(tid, (savesByTrack.get(tid) ?? 0) + 1);
    });

    savesCount = Array.from(savesByTrack.values()).reduce((sum, value) => sum + value, 0);
  }

  const uniqByTrack = new Map<string, Set<string>>();

  if (trackIds.length > 0) {
    let listensQuery = supabaseAdmin
      .from("valid_listen_events")
      .select("track_id, user_id")
      .in("track_id", trackIds);

    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromISO = from.toISOString().slice(0, 10);
      listensQuery = listensQuery.gte("created_at", `${fromISO}T00:00:00.000Z`);
    }

    const { data: listenRows, error: listenErr } = await listensQuery;

    if (listenErr) throw new Error(listenErr.message);

    ((listenRows || []) as ValidListenRow[]).forEach((row) => {
      const tid = String(row.track_id);
      const uid = row.user_id ? String(row.user_id) : null;
      if (!uid) return;

      const set = uniqByTrack.get(tid) ?? new Set<string>();
      set.add(uid);
      uniqByTrack.set(tid, set);
    });
  }

  const eligibleTrackIds = trackIds.filter(
    (id) => (uniqByTrack.get(String(id))?.size ?? 0) >= 2
  );

  const totalListeners = eligibleTrackIds.reduce(
    (sum, id) => sum + (uniqByTrack.get(String(id))?.size ?? 0),
    0
  );

  const totalSaves = eligibleTrackIds.reduce(
    (sum, id) => sum + (savesByTrack.get(String(id)) ?? 0),
    0
  );

  const conversionPct =
    totalListeners > 0 ? (totalSaves / totalListeners) * 100 : Number.NaN;

  return {
    summary,
    followersCount: followersCount ?? 0,
    savesCount: savesCount ?? 0,
    conversionPct,
  };
}
