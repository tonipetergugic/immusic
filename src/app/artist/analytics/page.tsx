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

  const summary = (await getArtistAnalyticsSummary({
    artistId,
    range: range as AnalyticsRange,
  })) as ArtistAnalyticsSummary;

  // Top tracks (30d view for now)
  const { data: topRows, error: topErr } = await supabase
    .from("analytics_artist_top_tracks_30d")
    .select("track_id, streams_30d, listeners_30d")
    .eq("artist_id", artistId)
    .order("streams_30d", { ascending: false })
    .limit(20);

  if (topErr) throw new Error(topErr.message);

  const ids = (topRows || []).map((r) => r.track_id);
  let titleById = new Map<string, string>();

  if (ids.length) {
    const { data: tracks, error: tracksErr } = await supabase
      .from("tracks")
      .select("id, title")
      .in("id", ids);

    if (tracksErr) throw new Error(tracksErr.message);
    (tracks || []).forEach((t) => titleById.set(t.id, t.title));
  }

  const topTracks: TopTrackRow[] = (topRows || []).map((r) => ({
    track_id: r.track_id,
    title: titleById.get(r.track_id) || "Unknown track",
    streams: Number((r as any).streams_30d ?? 0),
    unique_listeners: Number((r as any).listeners_30d ?? 0),
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

  let savesCount = 0;

  if (trackIds.length > 0) {
    const { count, error: savesErr } = await supabase
      .from("library_tracks")
      .select("track_id", { count: "exact", head: true })
      .in("track_id", trackIds);

    if (savesErr) throw new Error(savesErr.message);
    savesCount = count ?? 0;
  }

  // Conversion (live) — saves per peak 30d listener count (from topTracks)
  const peakListeners = topTracks.reduce((max, t) => {
    const v = Number((t as any).unique_listeners ?? 0);
    return v > max ? v : max;
  }, 0);

  const conversionPct =
    peakListeners > 0
      ? (Number(savesCount ?? 0) / peakListeners) * 100
      : 0;

  return (
    <ArtistAnalyticsClient
      artistId={artistId}
      initialTab={initialTab as any}
      initialRange={range}
      summary={summary}
      topTracks={topTracks}
      countryListeners30d={countryListeners30d}
      followersCount={followersCount ?? 0}
      savesCount={savesCount ?? 0}
      conversionPct={conversionPct}
    />
  );
}
