import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AnalyticsRange = "7d" | "28d" | "all";

export type StreamsOverTimePoint = {
  day: string;      // YYYY-MM-DD
  streams: number;
};

export type ListenersOverTimePoint = {
  day: string;      // YYYY-MM-DD
  listeners: number;
};

export type ArtistAnalyticsSummary = {
  range: AnalyticsRange;
  from: string; // timestamptz
  streams_over_time: StreamsOverTimePoint[];
  listeners_over_time: ListenersOverTimePoint[];
};

export async function getArtistAnalyticsSummary(params: {
  artistId: string;
  range: AnalyticsRange;
}): Promise<ArtistAnalyticsSummary> {
  const supabase = await createSupabaseServerClient();

  // Calculate date range
  const now = new Date();
  const rangeEnd = now.toISOString().split("T")[0]; // YYYY-MM-DD
  let rangeStart: string;
  
  if (params.range === "7d") {
    const date = new Date(now);
    date.setDate(date.getDate() - 7);
    rangeStart = date.toISOString().split("T")[0];
  } else if (params.range === "28d") {
    const date = new Date(now);
    date.setDate(date.getDate() - 28);
    rangeStart = date.toISOString().split("T")[0];
  } else {
    // "all" - use a very old date
    rangeStart = "2000-01-01";
  }

  const { data: rows, error } = await supabase
    .from("analytics_artist_kpi_daily")
    .select("day, streams, listened_seconds, unique_listeners")
    .eq("artist_id", params.artistId)
    .gte("day", rangeStart)
    .lte("day", rangeEnd)
    .order("day", { ascending: true });

  if (error) {
    throw error;
  }

  const totalStreams = rows?.reduce((sum, r) => sum + Number(r.streams), 0) ?? 0;
  const totalListeners =
    rows?.reduce((sum, r) => sum + Number(r.unique_listeners), 0) ?? 0;
  const totalListeningTime =
    rows?.reduce((sum, r) => sum + Number(r.listened_seconds), 0) ?? 0;

  const streamsOverTime =
    rows?.map(r => ({
      day: r.day,
      streams: Number(r.streams),
    })) ?? [];

  const listenersOverTime =
    rows?.map(r => ({
      day: r.day,
      listeners: Number(r.unique_listeners),
    })) ?? [];

  return {
    range: params.range,
    from: rangeStart,
    streams_over_time: streamsOverTime,
    listeners_over_time: listenersOverTime,
  };
}

