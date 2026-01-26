export type TrackViewModel = {
  id: string;
  title: string;
  version: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  lyrics: string | null;
  audio_url: string | null;
  cover_url: string | null;
  release_title: string | null;
  release_date_label: string | null;
  artist_id: string;
  artist_name: string | null;
  release_id: string | null;
};

export function normalizeTrackForPage(input: any): TrackViewModel {
  // input can be object or array (defensive)
  const t = Array.isArray(input) ? input[0] : input;
  return {
    id: String(t?.id ?? ""),
    title: String(t?.title ?? "Untitled"),
    version: t?.version ?? null,
    bpm: t?.bpm ?? null,
    key: t?.key ?? null,
    genre: t?.genre ?? null,
    lyrics: t?.lyrics ?? null,
    audio_url: t?.audio_url ?? null,
    cover_url: t?.cover_url ?? null,
    release_title: t?.release_title ?? null,
    release_date_label: t?.release_date_label ?? null,
    artist_id: String(t?.artist_id ?? ""),
    artist_name: t?.artist_name ?? null,
    release_id: t?.release_id ?? null,
  };
}
