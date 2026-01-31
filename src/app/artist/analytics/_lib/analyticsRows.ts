export type AnalyticsTrackDailyRow = {
  track_id: string | null;
  streams: number | null;
  listened_seconds: number | null;
  ratings_count: number | null;
  rating_avg: number | null;
};

export type ValidListenRow = { track_id: string | null; user_id: string | null };
export type ReleaseTrackRow = { release_id: string | null; track_id: string | null };
export type ReleaseRow = { id: string | null; cover_path: string | null };
export type TrackTitleRow = { id: string | null; title: string | null };
export type CountryStreamsRow = { country_iso2: string | null; listeners_30d: number | null };
export type SummaryRow = { unique_listeners_total: number | null };
