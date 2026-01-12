// src/lib/discovery/fetchPerformanceDiscovery.client.ts
"use client";

export type PerformanceDiscoveryItem = {
  track_id: string;
  artist_id: string;
  release_id: string;
  track_title: string;
  release_title: string;
  release_cover_path: string | null;
  exposure_status: string;
  exposure_completed_at: string | null;
  listeners_30d: number;
  streams_30d: number;
  listened_seconds_30d: number;
  listened_minutes_30d: number;
  rating_count: number;
  rating_avg: number;
  score_v1: number;
};

export async function fetchPerformanceDiscovery(limit = 30) {
  const res = await fetch(
    `/api/discovery/performance?limit=${limit}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch performance discovery");
  }

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error ?? "Unknown API error");
  }

  return json.items as PerformanceDiscoveryItem[];
}
