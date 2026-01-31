import type { Range } from "../components/ArtistAnalyticsClient";

export type TrackSort = "streams" | "listeners" | "rating" | "time";
export type Tab = "Overview" | "Audience" | "Tracks" | "Conversion";

export function normalizeRange(input: string | string[] | undefined): Range {
  const v = Array.isArray(input) ? input[0] : input;
  if (v === "7d" || v === "28d" || v === "all") return v;
  return "28d";
}

export function normalizeTab(input: string | string[] | undefined): Tab {
  const v = Array.isArray(input) ? input[0] : input;
  const raw = (v || "overview").toLowerCase();
  if (raw === "audience") return "Audience";
  if (raw === "tracks") return "Tracks";
  if (raw === "conversion") return "Conversion";
  return "Overview";
}

export function normalizeTrackSort(
  input: string | string[] | undefined
): TrackSort {
  const v = Array.isArray(input) ? input[0] : input;
  if (v === "streams" || v === "listeners" || v === "rating" || v === "time") return v;
  return "streams";
}
