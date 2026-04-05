export type Range = "7d" | "28d" | "all";

export type ArtistAnalyticsSummary = {
  range: Range;
  from: string;
  streams_over_time: Array<{
    day: string;
    streams: number;
  }>;
  listeners_over_time: Array<{
    day: string;
    listeners: number;
  }>;
  unique_listeners_total: number;
};

export type TopTrackRow = {
  track_id: string;
  title: string;
  cover_url: string | null;
  streams: number;
  unique_listeners: number;
  listened_seconds: number;
  ratings_count: number;
  rating_avg: number | null;
};

export type TrackDetailsRow = {
  track_id: string;
  title: string;
  cover_url: string | null;
  streams: number;
  unique_listeners: number;
  listened_seconds: number;
  ratings_count: number;
  rating_avg: number | null;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
};

export type CountryListeners30dRow = {
  country_iso2: string; // ISO2 only (DE, US, ES, ...)
  listeners_30d: number; // rolling 30d
};

export type TopConvertingTrackRow = {
  track_id: string;
  title: string;
  cover_url: string | null;
  listeners: number;
  saves: number;
  conversion_pct: number;
};
