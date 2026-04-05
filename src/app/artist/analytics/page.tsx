import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getArtistTrackIds } from "./_lib/getArtistTrackIds.server";
import { getAudienceTabData } from "./_lib/getAudienceTabData.server";
import { getConversionTabData } from "./_lib/getConversionTabData.server";
import { getOverviewTabData } from "./_lib/getOverviewTabData.server";
import { getRangeStartIso } from "./_lib/getRangeStartIso";
import { getTracksTabData } from "./_lib/getTracksTabData.server";
import ArtistAnalyticsClient from "./components/ArtistAnalyticsClient";
import type { ArtistAnalyticsSummary, Range } from "./types";
import {
  normalizeRange,
  normalizeTab,
  normalizeTrackSort,
  type TrackSort,
  type Tab,
} from "./_lib/analyticsParams";
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

  const awaitedSearchParams = (await searchParams) ?? {};

  const range = normalizeRange(awaitedSearchParams.range);
  const initialTab = normalizeTab(awaitedSearchParams.tab);
  const trackSort = normalizeTrackSort(awaitedSearchParams.sort);

  const overviewData =
    initialTab === "Overview"
      ? await getOverviewTabData({
          artistId,
          range,
        })
      : {
          summary: {
            range,
            from: "",
            streams_over_time: [],
            listeners_over_time: [],
            unique_listeners_total: 0,
          } satisfies ArtistAnalyticsSummary,
          followersCount: 0,
          savesCount: 0,
          conversionPct: Number.NaN,
        };

  const tracksData = await getTracksTabData({
    artistId,
    range,
    ratingBreakdownFromIso: getRangeStartIso(range),
    trackSort,
  });

  const audienceData =
    initialTab === "Audience"
      ? await getAudienceTabData({ artistId })
      : { countryListeners30d: [] };

  const trackIds = await getArtistTrackIds(artistId);

  const conversionData = await getConversionTabData({
    artistId,
    range,
    trackIds,
  });

  return (
    <ArtistAnalyticsClient
      artistId={artistId}
      initialTab={initialTab as Tab}
      initialRange={range}
      initialTrackSort={trackSort}
      summary={overviewData.summary}
      topTracks={tracksData.topTracks}
      topRatedTracks={tracksData.topRatedTracks}
      trackDetailsById={tracksData.trackDetailsById}
      countryListeners30d={audienceData.countryListeners30d}
      followersCount={overviewData.followersCount ?? 0}
      savesCount={
        initialTab === "Conversion"
          ? conversionData.savesCount
          : overviewData.savesCount
      }
      topConvertingTracks={conversionData.topConvertingTracks}
      conversionPct={
        initialTab === "Conversion"
          ? conversionData.conversionPct
          : overviewData.conversionPct
      }
    />
  );
}
