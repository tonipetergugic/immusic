import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getArtistAnalyticsSummary, type AnalyticsRange } from "@/lib/analytics/getArtistAnalytics.server";
import ArtistAnalyticsClient, {
  type Range,
  type ArtistAnalyticsSummary,
  type TopTrackRow,
  type CountryListeners30dRow,
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

  // aggregate per track_id in JS (Supabase free plan friendly, no DB changes)
  type Agg = {
    streams: number;
    listened_seconds: number;
    ratings_count: number;
    rating_sum: number; // rating_avg * ratings_count
  };

  const aggByTrack = new Map<string, Agg>();

  (dailyRows || []).forEach((r: any) => {
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

    (vRows || []).forEach((r: any) => {
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
      new Set((rtRows || []).map((r: any) => String(r.release_id)))
    );

    const coverPathByReleaseId = new Map<string, string | null>();

    if (releaseIds.length) {
      const { data: relRows, error: relErr } = await supabase
        .from("releases")
        .select("id, cover_path")
        .in("id", releaseIds);

      if (relErr) throw new Error(relErr.message);

      (relRows || []).forEach((r: any) =>
        coverPathByReleaseId.set(
          String(r.id),
          r.cover_path ? String(r.cover_path) : null
        )
      );
    }

    (rtRows || []).forEach((r: any) => {
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

  let titleById = new Map<string, string>();

  if (ids.length) {
    const { data: tracks, error: tracksErr } = await supabase
      .from("tracks")
      .select("id, title")
      .in("id", ids);

    if (tracksErr) throw new Error(tracksErr.message);
    (tracks || []).forEach((t: any) => titleById.set(String(t.id), String(t.title)));
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
    console.error("[artist/analytics] world map (iso2) error:", countryError);
  }

  const countryListeners30d: CountryListeners30dRow[] = (countryRows ?? [])
    .map((r) => ({
      country_iso2: String((r as any).country_iso2 ?? "").trim().toUpperCase(),
      listeners_30d: Number((r as any).listeners_30d ?? 0),
    }))
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

  // Best converting track (Listeners -> Saves) for the active range
  // Listeners: distinct user_id from valid_listen_events in range
  // Saves: distinct user_id from library_tracks in range
  const now = new Date();
  const rangeStart =
    range === "7d"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : range === "28d"
        ? new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
        : null;

  const rangeStartIso = rangeStart ? rangeStart.toISOString() : null;

  type ConvertingTrack = {
    track_id: string;
    title: string;
    cover_url: string | null;
    listeners: number;
    saves: number;
    conversion_pct: number;
  };

  let topConvertingTracks: ConvertingTrack[] = [];

  if (trackIds.length > 0) {
    // Listeners (range truth)
    let listenQ = supabase
      .from("valid_listen_events")
      .select("track_id, user_id, created_at")
      .in("track_id", trackIds);

    if (rangeStartIso) listenQ = listenQ.gte("created_at", rangeStartIso);

    const { data: listenRows } = await listenQ;

    // Saves (range)
    let saveQ = supabase
      .from("library_tracks")
      .select("track_id, user_id, created_at")
      .in("track_id", trackIds);

    if (rangeStartIso) saveQ = saveQ.gte("created_at", rangeStartIso);

    const { data: saveRows } = await saveQ;

    const listenersByTrack = new Map<string, Set<string>>();
    for (const r of (listenRows ?? []) as any[]) {
      const tid = String(r.track_id);
      const uid = String(r.user_id);
      if (!listenersByTrack.has(tid)) listenersByTrack.set(tid, new Set());
      listenersByTrack.get(tid)!.add(uid);
    }

    const savesByTrack = new Map<string, Set<string>>();
    for (const r of (saveRows ?? []) as any[]) {
      const tid = String(r.track_id);
      const uid = String(r.user_id);
      if (!savesByTrack.has(tid)) savesByTrack.set(tid, new Set());
      savesByTrack.get(tid)!.add(uid);
    }

    for (const id of trackIds) {
      const listeners = listenersByTrack.get(id)?.size ?? 0;
      if (listeners < 2) continue; // hard filter

      const saves = savesByTrack.get(id)?.size ?? 0;
      const pct = (saves / listeners) * 100;

      topConvertingTracks.push({
        track_id: id,
        title: titleById.get(id) || "Unknown track",
        cover_url: toPublicCoverUrl(coverPathByTrackId.get(id) ?? null),
        listeners,
        saves,
        conversion_pct: pct,
      });
    }

    topConvertingTracks = topConvertingTracks
      .sort((a, b) => {
        if (b.conversion_pct !== a.conversion_pct) {
          return b.conversion_pct - a.conversion_pct;
        }
        return b.saves - a.saves;
      })
      .slice(0, 3);
  }

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
  const uniqueListenersInRange = Number((summary as any)?.unique_listeners_total ?? 0);

  const conversionPct =
    uniqueListenersInRange > 0
      ? (Number(savesCount ?? 0) / uniqueListenersInRange) * 100
      : Number.NaN;

  return (
    <ArtistAnalyticsClient
      artistId={artistId}
      initialTab={initialTab as any}
      initialRange={range}
      initialTrackSort={trackSort}
      summary={summary}
      topTracks={topTracks}
      topRatedTracks={topRatedTracks}
      countryListeners30d={countryListeners30d}
      followersCount={followersCount ?? 0}
      savesCount={savesCount ?? 0}
      conversionPct={conversionPct}
      topConvertingTracks={topConvertingTracks}
    />
  );
}
