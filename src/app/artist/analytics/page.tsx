import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getArtistAnalyticsSummary, type AnalyticsRange } from "@/lib/analytics/getArtistAnalytics.server";
import { getTrackRatingBreakdownById } from "@/lib/analytics/getTrackRatingBreakdown.server";
import ArtistAnalyticsClient from "./components/ArtistAnalyticsClient";
import type {
  Range,
  ArtistAnalyticsSummary,
  TopTrackRow,
  TrackDetailsRow,
  CountryListeners30dRow,
  TopConvertingTrackRow,
} from "./types";
import {
  normalizeRange,
  normalizeTab,
  normalizeTrackSort,
  type TrackSort,
  type Tab,
} from "./_lib/analyticsParams";
import type {
  AnalyticsTrackDailyRow,
  ValidListenRow,
  ReleaseRow,
  TrackTitleRow,
  CountryStreamsRow,
  SummaryRow,
} from "./_lib/analyticsRows";

export const dynamic = "force-dynamic";

export default async function ArtistAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("Profile not found.");
  if (profile.role !== "artist" && profile.role !== "admin") redirect("/artist/onboarding");

  const artistId = profile.id;
  const supabaseAdmin = getSupabaseAdmin();

  const awaitedSearchParams = (await searchParams) ?? {};

  const range = normalizeRange(awaitedSearchParams.range);
  const initialTab = normalizeTab(awaitedSearchParams.tab);
  const trackSort = normalizeTrackSort(awaitedSearchParams.sort);

  const summary = (await getArtistAnalyticsSummary({
    artistId,
    range: range as AnalyticsRange,
  })) as ArtistAnalyticsSummary;

  // Top tracks (range-based, derived from analytics_track_daily)
  const rangeToDays = (r: Range): number | null => {
    if (r === "7d") return 7;
    if (r === "28d") return 28;
    if (r === "all") return null;
    return 28;
  };

  const days = rangeToDays(range);

  let topQuery = supabase
    .from("analytics_track_daily")
    .select(
      "track_id, streams, listeners, listened_seconds, ratings_count, rating_avg"
    )
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
    ratings_count: number;
    rating_sum: number; // rating_avg * ratings_count
  };

  const aggByTrack = new Map<string, Agg>();

  ((dailyRows || []) as AnalyticsTrackDailyRow[]).forEach((r) => {
    const id = String(r.track_id);
    const streams = Number(r.streams ?? 0);
    const listened_seconds = Number(r.listened_seconds ?? 0);
    const ratings_count = Number(r.ratings_count ?? 0);
    const rating_avg = r.rating_avg === null || r.rating_avg === undefined ? null : Number(r.rating_avg);

    const prev = aggByTrack.get(id) ?? {
      streams: 0,
      listened_seconds: 0,
      ratings_count: 0,
      rating_sum: 0,
    };

    prev.streams += streams;
    prev.listened_seconds += listened_seconds;
    prev.ratings_count += ratings_count;

    if (rating_avg !== null && ratings_count > 0) {
      prev.rating_sum += rating_avg * ratings_count;
    }

    aggByTrack.set(id, prev);
  });

  const topAgg = Array.from(aggByTrack.entries())
    .map(([track_id, a]) => ({
      track_id,
      streams: a.streams,
      unique_listeners: 0,
      listened_seconds: a.listened_seconds,
      ratings_count: a.ratings_count,
      rating_avg: a.ratings_count > 0 ? a.rating_sum / a.ratings_count : null,
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

  const sortedTopAgg = [...topAggWithListeners].sort((a, b) => {
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

  const detailTrackIds = sortedTopAgg.map((r) => r.track_id);
  const ratingBreakdownFromIso: string | null =
    days === null ? null : `${summary.from}T00:00:00.000Z`;

  const ratingBreakdownById = await getTrackRatingBreakdownById({
    trackIds: detailTrackIds,
    fromIso: ratingBreakdownFromIso,
  });

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

  // Top rated tracks (range-based, derived from topAgg)
  const MIN_RATINGS = 3;

  const topRatedAgg = topAggWithListeners
    .filter((r) => (r.ratings_count ?? 0) >= MIN_RATINGS && r.rating_avg !== null)
    .sort((a, b) => {
      const ra = Number(a.rating_avg ?? 0);
      const rb = Number(b.rating_avg ?? 0);
      if (rb !== ra) return rb - ra;
      return Number(b.ratings_count ?? 0) - Number(a.ratings_count ?? 0);
    })
    .slice(0, 20);

  const topRatedTracks: TopTrackRow[] = topRatedAgg.map((r) => ({
    track_id: r.track_id,
    title: titleById.get(r.track_id) || "Unknown track",
    cover_url: toPublicCoverUrl(coverPathByTrackId.get(r.track_id) ?? null),
    streams: Number(r.streams ?? 0),
    unique_listeners: Number(r.unique_listeners ?? 0),
    listened_seconds: Number(r.listened_seconds ?? 0),
    ratings_count: Number(r.ratings_count ?? 0),
    rating_avg: r.rating_avg === null || r.rating_avg === undefined ? null : Number(r.rating_avg),
  }));

  const { data: countryRows, error: countryError } = await supabaseAdmin
    .from("artist_country_listeners_30d")
    .select("country_iso2, listeners_30d")
    .eq("artist_id", artistId)
    .order("listeners_30d", { ascending: false })
    .limit(250);

  if (countryError) {
    // intentionally silent: analytics world map errors are non-blocking
  }

  const countryListeners30d: CountryListeners30dRow[] = (countryRows ?? [])
    .map((r) => {
      const row = r as CountryStreamsRow;
      return {
        country_iso2: String(row.country_iso2 ?? "").trim().toUpperCase(),
        listeners_30d: Number(row.listeners_30d ?? 0),
      };
    })
    .filter((r) => r.country_iso2.length === 2 && r.listeners_30d > 0);

  // Followers (live) — how many profiles follow this artist
  const { count: followersCount, error: followersErr } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", artistId);

  if (followersErr) throw new Error(followersErr.message);

  // Saves (live) — how many times tracks of this artist are in user libraries
  const { data: artistTracks, error: artistTracksErr } = await supabase
    .from("tracks")
    .select("id")
    .eq("artist_id", artistId);

  if (artistTracksErr) throw new Error(artistTracksErr.message);

  const trackIds = (artistTracks || []).map((t) => t.id);

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

  // Top converting tracks (server-side, no DB changes)
  const topConvertingTracks: TopConvertingTrackRow[] = [];

  if (trackIds.length > 0) {
    // Unique listeners per track in selected range (truth from valid_listen_events)
    const uniqByTrack = new Map<string, Set<string>>();

    let vq2 = supabaseAdmin
      .from("valid_listen_events")
      .select("track_id, user_id")
      .in("track_id", trackIds);

    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const fromISO = from.toISOString().slice(0, 10);
      vq2 = vq2.gte("created_at", `${fromISO}T00:00:00.000Z`);
    }

    const { data: vRows2, error: vErr2 } = await vq2;
    if (vErr2) throw new Error(vErr2.message);

    ((vRows2 || []) as ValidListenRow[]).forEach((r) => {
      const tid = String(r.track_id);
      const uid = r.user_id ? String(r.user_id) : null;
      if (!uid) return;

      const set = uniqByTrack.get(tid) ?? new Set<string>();
      set.add(uid);
      uniqByTrack.set(tid, set);
    });

    // Hard rule: only tracks with at least 2 listeners in selected range
    const eligibleTrackIds = trackIds.filter(
      (id) => (uniqByTrack.get(String(id))?.size ?? 0) >= 2
    );

    if (eligibleTrackIds.length > 0) {
      // Saves per track (current library state)
      let savesQuery2 = supabaseAdmin
        .from("library_tracks")
        .select("track_id")
        .in("track_id", eligibleTrackIds)
        .neq("user_id", artistId);

      if (days !== null) {
        const from = new Date();
        from.setDate(from.getDate() - (days - 1));
        const fromISO = from.toISOString().slice(0, 10);
        savesQuery2 = savesQuery2.gte("created_at", `${fromISO}T00:00:00.000Z`);
      }

      const { data: saveRows2, error: savesErr2 } = await savesQuery2;

      if (savesErr2) throw new Error(savesErr2.message);

      const savesByTrack = new Map<string, number>();
      ((saveRows2 || []) as { track_id: string | null }[]).forEach((r) => {
        const tid = r.track_id ? String(r.track_id) : null;
        if (!tid) return;
        savesByTrack.set(tid, (savesByTrack.get(tid) ?? 0) + 1);
      });

      // Titles for eligible tracks
      const { data: titleRows2, error: titleErr2 } = await supabase
        .from("tracks")
        .select("id, title")
        .in("id", eligibleTrackIds);

      if (titleErr2) throw new Error(titleErr2.message);

      const titleByEligibleId = new Map<string, string>();
      ((titleRows2 || []) as TrackTitleRow[]).forEach((t) =>
        titleByEligibleId.set(String(t.id), String(t.title ?? "Unknown track"))
      );

      const coverPathByEligibleTrackId = await loadPublishedCoverPathByTrackIds(
        eligibleTrackIds.map((id) => String(id))
      );

      const items = eligibleTrackIds
        .map((id) => {
          const tid = String(id);
          const listeners = uniqByTrack.get(tid)?.size ?? 0;
          const saves = savesByTrack.get(tid) ?? 0;
          const conversion_pct = listeners > 0 ? (saves / listeners) * 100 : 0;

          return {
            track_id: tid,
            title: titleByEligibleId.get(tid) || "Unknown track",
            cover_url: toPublicCoverUrl(coverPathByEligibleTrackId.get(tid) ?? null),
            listeners,
            saves,
            conversion_pct,
          } satisfies TopConvertingTrackRow;
        })
        .sort((a, b) => {
          if (b.conversion_pct !== a.conversion_pct) return b.conversion_pct - a.conversion_pct;
          if (b.listeners !== a.listeners) return b.listeners - a.listeners;
          return b.saves - a.saves;
        })
        .slice(0, 5);

      topConvertingTracks.push(...items);
    }
  }

  return (
    <ArtistAnalyticsClient
      artistId={artistId}
      initialTab={initialTab as Tab}
      initialRange={range}
      initialTrackSort={trackSort}
      summary={summary}
      topTracks={topTracks}
      topRatedTracks={topRatedTracks}
      trackDetailsById={trackDetailsById}
      countryListeners30d={countryListeners30d}
      followersCount={followersCount ?? 0}
      savesCount={savesCount ?? 0}
      topConvertingTracks={topConvertingTracks}
      conversionPct={conversionPct}
    />
  );
}
