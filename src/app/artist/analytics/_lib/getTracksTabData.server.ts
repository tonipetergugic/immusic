import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getTrackRatingBreakdownById } from "@/lib/analytics/getTrackRatingBreakdown.server";
import type { Range, TopTrackRow, TrackDetailsRow } from "../types";
import type { AnalyticsTrackDailyRow, ValidListenRow, TrackTitleRow } from "./analyticsRows";

export type TracksTabData = {
  topTracks: TopTrackRow[];
  trackDetailsById: Record<string, TrackDetailsRow>;
};

function rangeToDays(r: Range): number | null {
  if (r === "7d") return 7;
  if (r === "28d") return 28;
  if (r === "all") return null;
  return 28;
}

function getRangeRatingMetrics(
  breakdown:
    | Pick<
        TrackDetailsRow,
        | "rating_1_count"
        | "rating_2_count"
        | "rating_3_count"
        | "rating_4_count"
        | "rating_5_count"
      >
    | null
    | undefined
) {
  const rating1 = Number(breakdown?.rating_1_count ?? 0);
  const rating2 = Number(breakdown?.rating_2_count ?? 0);
  const rating3 = Number(breakdown?.rating_3_count ?? 0);
  const rating4 = Number(breakdown?.rating_4_count ?? 0);
  const rating5 = Number(breakdown?.rating_5_count ?? 0);

  const ratings_count = rating1 + rating2 + rating3 + rating4 + rating5;
  const weighted_sum =
    rating1 * 1 +
    rating2 * 2 +
    rating3 * 3 +
    rating4 * 4 +
    rating5 * 5;

  return {
    ratings_count,
    rating_avg: ratings_count > 0 ? weighted_sum / ratings_count : null,
  };
}

export async function getTracksTabData(args: {
  artistId: string;
  range: Range;
  ratingBreakdownFromIso: string | null;
  trackSort: "streams" | "listeners" | "rating" | "time";
}): Promise<TracksTabData> {
  const { artistId, range, ratingBreakdownFromIso, trackSort } = args;

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  // Top tracks (range-based, derived from analytics_track_daily)
  const days = rangeToDays(range);

  let topQuery = supabase
    .from("analytics_track_daily")
    .select("track_id, streams, listeners, listened_seconds")
    .eq("artist_id", artistId);

  if (days !== null) {
    // inclusive window: last N days up to today
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromISO = from.toISOString().slice(0, 10);
    topQuery = topQuery.gte("day", fromISO);
  }

  const { data: dailyRows, error: dailyErr } = await topQuery;

  if (dailyErr) throw new Error(dailyErr.message);

  // aggregate per track_id in JS (Supabase free plan friendly, no DB changes)
  type Agg = {
    streams: number;
    listened_seconds: number;
  };

  const aggByTrack = new Map<string, Agg>();

  ((dailyRows || []) as unknown as AnalyticsTrackDailyRow[]).forEach((r) => {
    const id = String(r.track_id);
    const streams = Number(r.streams ?? 0);
    const listened_seconds = Number(r.listened_seconds ?? 0);

    const prev = aggByTrack.get(id) ?? {
      streams: 0,
      listened_seconds: 0,
    };

    prev.streams += streams;
    prev.listened_seconds += listened_seconds;

    aggByTrack.set(id, prev);
  });

  const topAgg = Array.from(aggByTrack.entries()).map(([track_id, a]) => ({
    track_id,
    streams: a.streams,
    unique_listeners: 0,
    listened_seconds: a.listened_seconds,
    ratings_count: 0,
    rating_avg: null,
  }));

  // fetch titles for these track ids
  const ids = topAgg.map((r) => r.track_id);

  // Unique listeners per track over the selected range (truth from valid_listen_events)
  const uniqByTrackId = new Map<string, Set<string>>();

  if (ids.length > 0) {
    let vq = supabaseAdmin
      .from("valid_listen_events")
      .select("track_id, user_id")
      .in("track_id", ids);

    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromISO = from.toISOString().slice(0, 10);
      vq = vq.gte("created_at", `${fromISO}T00:00:00.000Z`);
    }

    const { data: vRows, error: vErr } = await vq;
    if (vErr) throw new Error(vErr.message);

    ((vRows || []) as ValidListenRow[]).forEach((r) => {
      const tid = String(r.track_id);
      const uid = r.user_id ? String(r.user_id) : null;
      if (!uid) return;

      const set = uniqByTrackId.get(tid) ?? new Set<string>();
      set.add(uid);
      uniqByTrackId.set(tid, set);
    });
  }

  const topAggWithListeners = topAgg.map((row) => ({
    ...row,
    unique_listeners: uniqByTrackId.get(row.track_id)?.size ?? 0,
  }));

  const detailTrackIds = topAggWithListeners.map((r) => r.track_id);

  const ratingBreakdownById = await getTrackRatingBreakdownById({
    trackIds: detailTrackIds,
    fromIso: ratingBreakdownFromIso,
  });

  const topAggWithRatings = topAggWithListeners.map((row) => {
    const metrics = getRangeRatingMetrics(ratingBreakdownById[row.track_id]);
    return {
      ...row,
      ratings_count: metrics.ratings_count,
      rating_avg: metrics.rating_avg,
    };
  });

  const sortedTopAgg = [...topAggWithRatings].sort((a, b) => {
    if (trackSort === "listeners") {
      return (b.unique_listeners ?? 0) - (a.unique_listeners ?? 0);
    }
    if (trackSort === "streams") {
      return (b.streams ?? 0) - (a.streams ?? 0);
    }
    if (trackSort === "time") {
      return (b.listened_seconds ?? 0) - (a.listened_seconds ?? 0);
    }
    if (trackSort === "rating") {
      const ra = a.rating_avg === null ? -1 : Number(a.rating_avg);
      const rb = b.rating_avg === null ? -1 : Number(b.rating_avg);
      if (rb !== ra) return rb - ra;
      return (b.ratings_count ?? 0) - (a.ratings_count ?? 0);
    }
    return (b.streams ?? 0) - (a.streams ?? 0);
  });

  const toPublicCoverUrl = (p: string | null): string | null => {
    if (!p) return null;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    const { data } = supabase.storage.from("release_covers").getPublicUrl(p);
    return data.publicUrl ?? null;
  };

  const loadPublishedCoverPathByTrackIds = async (trackIds: string[]) => {
    const coverPathByTrackId = new Map<string, string | null>();

    if (!trackIds.length) return coverPathByTrackId;

    const { data: releaseTrackRows, error: releaseTrackErr } = await supabase
      .from("release_tracks")
      .select(`
      track_id,
      release_id,
      releases!inner (
        id,
        status,
        cover_path,
        published_at,
        created_at
      )
    `)
      .in("track_id", trackIds)
      .eq("releases.status", "published");

    if (releaseTrackErr) throw new Error(releaseTrackErr.message);

    type PublishedReleasePickRow = {
      track_id: string | null;
      release_id: string | null;
      releases:
        | {
            id: string | null;
            status: string | null;
            cover_path: string | null;
            published_at: string | null;
            created_at: string | null;
          }
        | {
            id: string | null;
            status: string | null;
            cover_path: string | null;
            published_at: string | null;
            created_at: string | null;
          }[]
        | null;
    };

    const bestByTrackId = new Map<
      string,
      {
        release_id: string;
        cover_path: string | null;
        published_at: string | null;
        created_at: string | null;
      }
    >();

    ((releaseTrackRows || []) as PublishedReleasePickRow[]).forEach((row) => {
      const trackId = row.track_id ? String(row.track_id) : null;
      if (!trackId) return;

      const release = Array.isArray(row.releases) ? row.releases[0] : row.releases;
      if (!release?.id) return;

      const next = {
        release_id: String(release.id),
        cover_path: release.cover_path ? String(release.cover_path) : null,
        published_at: release.published_at ? String(release.published_at) : null,
        created_at: release.created_at ? String(release.created_at) : null,
      };

      const prev = bestByTrackId.get(trackId);

      if (!prev) {
        bestByTrackId.set(trackId, next);
        return;
      }

      const nextPublished = next.published_at ?? "";
      const prevPublished = prev.published_at ?? "";

      if (nextPublished > prevPublished) {
        bestByTrackId.set(trackId, next);
        return;
      }

      if (nextPublished < prevPublished) return;

      const nextCreated = next.created_at ?? "";
      const prevCreated = prev.created_at ?? "";

      if (nextCreated > prevCreated) {
        bestByTrackId.set(trackId, next);
        return;
      }

      if (nextCreated < prevCreated) return;

      if (next.release_id > prev.release_id) {
        bestByTrackId.set(trackId, next);
      }
    });

    bestByTrackId.forEach((value, key) => {
      coverPathByTrackId.set(key, value.cover_path);
    });

    return coverPathByTrackId;
  };

  const coverPathByTrackId = await loadPublishedCoverPathByTrackIds(ids);

  const titleById = new Map<string, string>();

  if (ids.length) {
    const { data: tracks, error: tracksErr } = await supabase
      .from("tracks")
      .select("id, title")
      .in("id", ids);

    if (tracksErr) throw new Error(tracksErr.message);
    ((tracks || []) as TrackTitleRow[]).forEach((t) =>
      titleById.set(String(t.id), String(t.title))
    );
  }

  const topTracks: TopTrackRow[] = sortedTopAgg.slice(0, 20).map((r) => ({
    track_id: r.track_id,
    title: titleById.get(r.track_id) || "Unknown track",
    cover_url: toPublicCoverUrl(coverPathByTrackId.get(r.track_id) ?? null),
    streams: Number(r.streams ?? 0),
    unique_listeners: Number(r.unique_listeners ?? 0),
    listened_seconds: Number(r.listened_seconds ?? 0),
    ratings_count: Number(r.ratings_count ?? 0),
    rating_avg: r.rating_avg === null || r.rating_avg === undefined ? null : Number(r.rating_avg),
  }));

  const trackDetailsById: Record<string, TrackDetailsRow> = Object.fromEntries(
    sortedTopAgg.map((r) => [
      r.track_id,
      {
        track_id: r.track_id,
        title: titleById.get(r.track_id) || "Unknown track",
        cover_url: toPublicCoverUrl(coverPathByTrackId.get(r.track_id) ?? null),
        streams: Number(r.streams ?? 0),
        unique_listeners: Number(r.unique_listeners ?? 0),
        listened_seconds: Number(r.listened_seconds ?? 0),
        ratings_count: Number(r.ratings_count ?? 0),
        rating_avg: r.rating_avg === null || r.rating_avg === undefined ? null : Number(r.rating_avg),
        ...(ratingBreakdownById[r.track_id] ?? {
          rating_1_count: 0,
          rating_2_count: 0,
          rating_3_count: 0,
          rating_4_count: 0,
          rating_5_count: 0,
        }),
      } satisfies TrackDetailsRow,
    ])
  );

  return {
    topTracks,
    trackDetailsById,
  };
}
