import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getArtistAnalyticsSummary, type AnalyticsRange } from "@/lib/analytics/getArtistAnalytics.server";
import ArtistAnalyticsClient, {
  type Range,
  type ArtistAnalyticsSummary,
  type TopTrackRow,
  type CountryListeners30dRow,
  type TopConvertingTrackRow,
} from "./components/ArtistAnalyticsClient";

export const dynamic = "force-dynamic";

function normalizeRange(input: string | string[] | undefined): Range {
  const v = Array.isArray(input) ? input[0] : input;
  if (v === "7d" || v === "28d" || v === "all") return v;
  return "28d";
}

function normalizeTab(input: string | string[] | undefined) {
  const v = Array.isArray(input) ? input[0] : input;
  const raw = (v || "overview").toLowerCase();
  if (raw === "audience") return "Audience";
  if (raw === "tracks") return "Tracks";
  if (raw === "conversion") return "Conversion";
  return "Overview";
}

type TrackSort = "streams" | "listeners" | "rating" | "time";

function normalizeTrackSort(input: string | string[] | undefined): TrackSort {
  const v = Array.isArray(input) ? input[0] : input;
  if (v === "streams" || v === "listeners" || v === "rating" || v === "time") return v;
  return "streams";
}

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

  type AnalyticsTrackDailyRow = {
    track_id: string | null;
    streams: number | null;
    listened_seconds: number | null;
    ratings_count: number | null;
    rating_avg: number | null;
  };

  type ValidListenRow = { track_id: string | null; user_id: string | null };
  type ReleaseTrackRow = { release_id: string | null; track_id: string | null };
  type ReleaseRow = { id: string | null; cover_path: string | null };
  type TrackTitleRow = { id: string | null; title: string | null };
  type CountryStreamsRow = { country_iso2: string | null; listeners_30d: number | null };
  type SummaryRow = { unique_listeners_total: number | null };

  type Tab = "Overview" | "Audience" | "Tracks" | "Conversion";

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
    }))
    .sort((a, b) => {
      if (trackSort === "listeners") return (b.unique_listeners ?? 0) - (a.unique_listeners ?? 0);
      if (trackSort === "time") return (b.listened_seconds ?? 0) - (a.listened_seconds ?? 0);
      if (trackSort === "rating") {
        const ra = a.rating_avg === null ? -1 : Number(a.rating_avg);
        const rb = b.rating_avg === null ? -1 : Number(b.rating_avg);
        if (rb !== ra) return rb - ra;
        return (b.ratings_count ?? 0) - (a.ratings_count ?? 0);
      }
      return (b.streams ?? 0) - (a.streams ?? 0);
    })
    .slice(0, 20);

  // fetch titles for these track ids
  const ids = topAgg.map((r) => r.track_id);

  // Unique listeners per track over the selected range (truth from valid_listen_events)
  const uniqByTrackId = new Map<string, Set<string>>();

  if (ids.length > 0) {
    let vq = supabase
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

  // resolve cover_path via release_tracks -> releases
  const coverPathByTrackId = new Map<string, string | null>();

  if (ids.length) {
    const { data: rtRows, error: rtErr } = await supabase
      .from("release_tracks")
      .select("track_id, release_id")
      .in("track_id", ids);

    if (rtErr) throw new Error(rtErr.message);

    const releaseIds = Array.from(
      new Set(((rtRows || []) as ReleaseTrackRow[]).map((r) => String(r.release_id)))
    );

    const coverPathByReleaseId = new Map<string, string | null>();

    if (releaseIds.length) {
      const { data: relRows, error: relErr } = await supabase
        .from("releases")
        .select("id, cover_path")
        .in("id", releaseIds);

      if (relErr) throw new Error(relErr.message);

      ((relRows || []) as ReleaseRow[]).forEach((r) =>
        coverPathByReleaseId.set(
          String(r.id),
          r.cover_path ? String(r.cover_path) : null
        )
      );
    }

    ((rtRows || []) as ReleaseTrackRow[]).forEach((r) => {
      const trackId = String(r.track_id);
      const relId = String(r.release_id);
      const coverPath = coverPathByReleaseId.get(relId) ?? null;
      // first match wins (good enough for now)
      if (!coverPathByTrackId.has(trackId)) coverPathByTrackId.set(trackId, coverPath);
    });
  }

  const toPublicCoverUrl = (p: string | null): string | null => {
    if (!p) return null;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    const { data } = supabase.storage.from("release_covers").getPublicUrl(p);
    return data.publicUrl ?? null;
  };

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

  const topTracks: TopTrackRow[] = topAgg.map((r) => ({
    track_id: r.track_id,
    title: titleById.get(r.track_id) || "Unknown track",
    cover_url: toPublicCoverUrl(coverPathByTrackId.get(r.track_id) ?? null),
    streams: Number(r.streams ?? 0),
    unique_listeners: uniqByTrackId.get(r.track_id)?.size ?? 0,
    listened_seconds: Number(r.listened_seconds ?? 0),
    ratings_count: Number(r.ratings_count ?? 0),
    rating_avg: r.rating_avg === null || r.rating_avg === undefined ? null : Number(r.rating_avg),
  }));

  // Top rated tracks (range-based, derived from topAgg)
  const MIN_RATINGS = 3;

  const topRatedAgg = topAgg
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

  const { data: countryRows, error: countryError } = await supabase
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
    const { count, error: savesErr } = await supabase
      .from("library_tracks")
      .select("track_id", { count: "exact", head: true })
      .in("track_id", trackIds);

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

    let vq2 = supabase
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
      const { data: saveRows2, error: savesErr2 } = await supabase
        .from("library_tracks")
        .select("track_id")
        .in("track_id", eligibleTrackIds);

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

      // Cover urls for eligible tracks (release_tracks -> releases.cover_path)
      const coverPathByEligibleTrackId = new Map<string, string | null>();

      const { data: rt2, error: rt2Err } = await supabase
        .from("release_tracks")
        .select("track_id, release_id")
        .in("track_id", eligibleTrackIds);

      if (rt2Err) throw new Error(rt2Err.message);

      const relIds2 = Array.from(
        new Set(((rt2 || []) as ReleaseTrackRow[]).map((r) => String(r.release_id)))
      );

      const coverPathByReleaseId2 = new Map<string, string | null>();

      if (relIds2.length) {
        const { data: rel2, error: rel2Err } = await supabase
          .from("releases")
          .select("id, cover_path")
          .in("id", relIds2);

        if (rel2Err) throw new Error(rel2Err.message);

        ((rel2 || []) as ReleaseRow[]).forEach((r) =>
          coverPathByReleaseId2.set(
            String(r.id),
            r.cover_path ? String(r.cover_path) : null
          )
        );
      }

      ((rt2 || []) as ReleaseTrackRow[]).forEach((r) => {
        const tid = String(r.track_id);
        const rid = String(r.release_id);
        const cp = coverPathByReleaseId2.get(rid) ?? null;
        if (!coverPathByEligibleTrackId.has(tid)) coverPathByEligibleTrackId.set(tid, cp);
      });

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
      countryListeners30d={countryListeners30d}
      followersCount={followersCount ?? 0}
      savesCount={savesCount ?? 0}
      topConvertingTracks={topConvertingTracks}
      conversionPct={conversionPct}
    />
  );
}
