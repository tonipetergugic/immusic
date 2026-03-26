export type PlayerTrack = {
  id: string;
  title: string;
  version?: string | null;
  artist_id: string;
  status?: string | null;
  is_explicit?: boolean | null;
  artists?: { id: string; display_name: string }[];
  cover_url: string | null;
  audio_url: string;
  duration_seconds?: number | null;
  bpm?: number | null;
  key?: string | null;
  genre?: string | null;
  profiles?: {
    display_name?: string | null;
  };
  release_id?: string | null;
  release_track_id?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  my_stars?: number | null;
};

