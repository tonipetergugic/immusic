import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type TrackRatingBreakdownCounts = {
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
};

function emptyCounts(): TrackRatingBreakdownCounts {
  return {
    rating_1_count: 0,
    rating_2_count: 0,
    rating_3_count: 0,
    rating_4_count: 0,
    rating_5_count: 0,
  };
}

type TrackRatingRow = {
  track_id: string | null;
  stars: number | null;
};

export async function getTrackRatingBreakdownById(args: {
  trackIds: string[];
  fromIso: string | null;
}): Promise<Record<string, TrackRatingBreakdownCounts>> {
  if (args.trackIds.length === 0) return {};

  const supabase = getSupabaseAdmin();

  let q = supabase.from("track_ratings").select("track_id, stars").in("track_id", args.trackIds);

  if (args.fromIso !== null) {
    q = q.gte("created_at", args.fromIso);
  }

  const { data, error } = await q;

  if (error) throw new Error(error.message);

  const out: Record<string, TrackRatingBreakdownCounts> = {};
  for (const id of args.trackIds) {
    out[id] = emptyCounts();
  }

  for (const row of (data ?? []) as TrackRatingRow[]) {
    const tid = row.track_id ? String(row.track_id) : null;
    if (!tid || out[tid] === undefined) continue;

    const s = row.stars;
    if (s === 1) out[tid].rating_1_count += 1;
    else if (s === 2) out[tid].rating_2_count += 1;
    else if (s === 3) out[tid].rating_3_count += 1;
    else if (s === 4) out[tid].rating_4_count += 1;
    else if (s === 5) out[tid].rating_5_count += 1;
  }

  return out;
}
