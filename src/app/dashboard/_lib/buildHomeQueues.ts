export type ArtistMini = { id: string; display_name: string };

function uniqArtists(list: ArtistMini[]) {
  const out: ArtistMini[] = [];
  for (const a of list) {
    if (!a?.id) continue;
    if (!out.some((x) => x.id === a.id)) out.push(a);
  }
  return out;
}

export function buildDevQueue(params: {
  devItems: any[];
  supabase: any;
  trackArtistsMap: Record<string, ArtistMini[]>;
}) {
  const { devItems, supabase, trackArtistsMap } = params;

  return (devItems ?? []).slice(0, 20).map((it: any) => {
    const trackId = it.track_id;
    const title = it.title || "Untitled";
    const artist = it.artist_name ?? "—";
    const releaseId = it.release_id;

    const coverUrl = it.cover_path
      ? supabase.storage.from("release_covers").getPublicUrl(it.cover_path).data.publicUrl
      : null;

    const audioUrl = it.audio_path
      ? supabase.storage.from("tracks").getPublicUrl(it.audio_path).data.publicUrl
      : null;

    const ownerId = String(it.artist_id ?? "");
    const ownerName = String(it.artist_name ?? "—");
    const owner = ownerId ? [{ id: ownerId, display_name: ownerName }] : [];

    const collabs = (trackArtistsMap?.[trackId] ?? []).map((a: any) => ({
      id: String(a.id),
      display_name: String(a.display_name ?? "Unknown Artist"),
    }));

    const artists = uniqArtists([...(owner as any), ...(collabs as any)]);

    return {
      id: trackId,
      artist_id: it.artist_id,
      title,
      version: (it as any)?.version ?? null,
      cover_url: coverUrl,
      audio_url: audioUrl,
      audio_path: it.audio_path ?? null,
      profiles: { display_name: artist },
      release_id: releaseId,
      release_track_id: it.release_track_id ?? null,
      rating_avg: it.rating_avg ?? null,
      rating_count: it.rating_count ?? 0,
      stream_count: it.stream_count ?? 0,
      my_stars: it.my_stars ?? null,
      bpm: it.bpm ?? null,
      key: it.key ?? null,
      artists,
      // genre bleibt im UI-Slot über it.genre, nicht zwingend Teil von PlayerTrack
    } as unknown as any;
  });
}

export function buildPerfQueue(params: {
  performanceItemsFiltered: any[];
  perfArtistMap: Record<string, string>;
  perfReleaseTrackMap: Record<
    string,
    { release_track_id: string; rating_avg: number | null; rating_count: number; stream_count: number }
  >;
  perfTrackMetaMap: Record<string, { bpm: number | null; key: string | null; genre: string | null; audio_path: string | null; version: string | null }>;
  supabase: any;
  trackArtistsMap: Record<string, ArtistMini[]>;
}) {
  const {
    performanceItemsFiltered,
    perfArtistMap,
    perfReleaseTrackMap,
    perfTrackMetaMap,
    supabase,
    trackArtistsMap,
  } = params;

  return (performanceItemsFiltered ?? []).map((it: any) => {
    const trackId = it.track_id;
    const title = it.track_title || "Untitled";
    const artistId = it.artist_id;
    const releaseId = it.release_id;

    const artistName = perfArtistMap[artistId] ?? "Unknown Artist";

    const coverUrl = it.release_cover_path
      ? supabase.storage.from("release_covers").getPublicUrl(it.release_cover_path).data.publicUrl
      : null;

    const audioPath = perfTrackMetaMap?.[trackId]?.audio_path ?? null;

    const audioUrl = audioPath
      ? supabase.storage.from("tracks").getPublicUrl(audioPath).data.publicUrl
      : null;

    const rtKey = `${releaseId}:${trackId}`;
    const rt = perfReleaseTrackMap[rtKey];
    const meta = perfTrackMetaMap?.[trackId];

    const ownerId = String(artistId ?? "");
    const ownerName = String(artistName ?? "Unknown Artist");
    const owner = ownerId ? [{ id: ownerId, display_name: ownerName }] : [];

    const collabs = (trackArtistsMap?.[trackId] ?? []).map((a: any) => ({
      id: String(a.id),
      display_name: String(a.display_name ?? "Unknown Artist"),
    }));

    const artists = uniqArtists([...(owner as any), ...(collabs as any)]);

    return {
      id: trackId,
      artist_id: artistId,
      title,
      version: (meta as any)?.version ?? null,
      cover_url: coverUrl,
      audio_url: audioUrl,
      audio_path: audioPath,
      profiles: { display_name: artistName },
      release_id: releaseId,
      release_track_id: rt?.release_track_id ?? null,
      rating_avg: rt?.rating_avg ?? (it.rating_avg ?? null),
      rating_count: rt?.rating_count ?? (it.rating_count ?? 0),
      stream_count: rt?.stream_count ?? (it.streams_30d ?? 0),
      bpm: perfTrackMetaMap?.[trackId]?.bpm ?? null,
      key: perfTrackMetaMap?.[trackId]?.key ?? null,
      artists,
    } as unknown as any;
  });
}
