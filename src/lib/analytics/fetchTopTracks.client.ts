export type AnalyticsRange = "7d" | "28d" | "all";

export type TopTrackItem = {
  track_id: string;
  streams: number;
};

export type TopTracksResponse = {
  range: AnalyticsRange;
  from: string;
  items: TopTrackItem[];
};

export async function fetchTopTracks(range: AnalyticsRange): Promise<TopTracksResponse> {
  const res = await fetch(`/api/artist/analytics/top-tracks?range=${range}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Failed to fetch top tracks (${res.status}): ${raw}`);
  }

  const json = JSON.parse(raw);
  return json.data as TopTracksResponse;
}

