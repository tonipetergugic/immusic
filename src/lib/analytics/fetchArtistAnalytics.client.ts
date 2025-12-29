import type {
  ArtistAnalyticsSummary,
  AnalyticsRange,
} from "./getArtistAnalytics.server";

export async function fetchArtistAnalyticsSummary(
  range: AnalyticsRange
): Promise<ArtistAnalyticsSummary> {
  const res = await fetch(
    `/api/artist/analytics/summary?range=${range}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  const raw = await res.text();

  // TEMP DEBUG (remove after verified)
  console.log("[analytics] range", range, "status", res.status, "raw", raw);

  if (!res.ok) {
    throw new Error(`Failed to fetch analytics (${res.status}): ${raw}`);
  }

  const json = JSON.parse(raw);
  return json.summary as ArtistAnalyticsSummary;
}

