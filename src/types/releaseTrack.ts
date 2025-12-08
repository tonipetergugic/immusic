export type ReleaseTrackRow = {
    id: string;
    release_id: string;
    position: number;
    track_title: string | null;
    tracks: {
      id: string;
      title: string | null;
      audio_path?: string | null;
    } | null;
    releases?: {
      id: string;
      cover_path: string | null;
      title: string | null;
      status: string | null;
    } | null;
  };
  