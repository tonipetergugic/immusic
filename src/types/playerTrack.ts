export type PlayerTrack = {
  id: string;
  title: string;
  artist_id: string;
  cover_url: string | null;
  audio_url: string;
  bpm?: number | null;
  key?: string | null;
  profiles?: {
    display_name?: string | null;
  };
};

