import "server-only";

import { getArtistAnalyticsSummary, type AnalyticsRange } from "@/lib/analytics/getArtistAnalytics.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Range } from "../types";
import type { SummaryRow } from "./analyticsRows";
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

  if (trackIds.length > 0) {
    let savesQuery = supabaseAdmin
      .from("library_tracks")
      .select("track_id", { count: "exact", head: true })
      .in("track_id", trackIds)
      .neq("user_id", artistId);

    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromISO = from.toISOString().slice(0, 10);
      savesQuery = savesQuery.gte("created_at", `${fromISO}T00:00:00.000Z`);
    }

    const { count, error: savesErr } = await savesQuery;

    if (savesErr) throw new Error(savesErr.message);
    savesCount = count ?? 0;
  }

  // Conversion (live) — saves per unique listeners in the active range
  // Listeners source of truth: summary.unique_listeners_total (range truth)
  const uniqueListenersInRange = Number(((summary as SummaryRow | null)?.unique_listeners_total) ?? 0);

  const conversionPct =
    uniqueListenersInRange > 0
      ? (Number(savesCount ?? 0) / uniqueListenersInRange) * 100
      : Number.NaN;

  return {
    summary,
    followersCount: followersCount ?? 0,
    savesCount: savesCount ?? 0,
    conversionPct,
  };
}
