import type { SupabaseClient } from "@supabase/supabase-js";
import type { DevelopmentDiscoveryItem } from "@/lib/discovery/fetchDevelopmentDiscovery.client";
import type { PerformanceDiscoveryItem } from "@/lib/discovery/fetchPerformanceDiscovery.client";

export type ArtistMini = { id: string; display_name: string };

type DevQueueSourceItem = DevelopmentDiscoveryItem & {
  version?: string | null;
  is_explicit?: boolean | null;
};

type PerfReleaseTrackAggregate = {
  release_track_id: string;
  rating_avg: number | null;
  rating_count: number;
  stream_count: number;
};

type PerfTrackMeta = {
  bpm: number | null;
  key: string | null;
  genre: string | null;
  audio_path: string | null;
  version: string | null;
  is_explicit?: boolean | null;
};

type HomeQueueTrack = {
  id: string;
  artist_id: string;
  status: "development" | "performance";
  title: string;
  version: string | null;
  is_explicit: boolean;
  cover_url: string | null;
  audio_url: string | null;
  audio_path: string | null;
  profiles: { display_name: string };
  release_id: string | null;
  release_track_id: string | null;
  rating_avg: number | null;
  rating_count: number;
  stream_count: number;
  my_stars?: number | null;
  bpm: number | null;
  key: string | null;
  artists: ArtistMini[];
};

function uniqArtists(list: ArtistMini[]) {
  const out: ArtistMini[] = [];
  for (const a of list) {
    if (!a?.id) continue;
    if (!out.some((x) => x.id === a.id)) out.push(a);
  }
  return out;
}

export function buildDevQueue(params: {
  devItems: DevQueueSourceItem[];
  supabase: SupabaseClient;
  trackArtistsMap: Record<string, ArtistMini[]>;
}): HomeQueueTrack[] {
  const { devItems, supabase, trackArtistsMap } = params;

  return (devItems ?? []).slice(0, 20).map((it) => {
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

    const collabs = (trackArtistsMap?.[trackId] ?? []).map((artistItem) => ({
      id: String(artistItem.id),
      display_name: String(artistItem.display_name ?? "Unknown Artist"),
    }));

    const artists = uniqArtists([...owner, ...collabs]);

    const queueItem: HomeQueueTrack = {
      id: trackId,
      artist_id: it.artist_id,
      status: "development",
      title,
      version: it.version ?? null,
      is_explicit: !!it.is_explicit,
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
    };

    return queueItem;
  });
}

export function buildPerfQueue(params: {
  performanceItemsFiltered: PerformanceDiscoveryItem[] | Array<{ track_id: string }>;
  perfArtistMap: Record<string, string>;
  perfReleaseTrackMap: Record<string, PerfReleaseTrackAggregate>;
  perfTrackMetaMap: Record<string, PerfTrackMeta>;
  supabase: SupabaseClient;
  trackArtistsMap: Record<string, ArtistMini[]>;
}): HomeQueueTrack[] {
  const {
    performanceItemsFiltered,
    perfArtistMap,
    perfReleaseTrackMap,
    perfTrackMetaMap,
    supabase,
    trackArtistsMap,
  } = params;

  return (performanceItemsFiltered ?? []).map((it) => {
    const row = it as PerformanceDiscoveryItem;
    const trackId = row.track_id;
    const title = row.track_title || "Untitled";
    const artistId = row.artist_id;
    const releaseId = row.release_id;

    const artistName = perfArtistMap[artistId] ?? "Unknown Artist";

    const coverUrl = row.release_cover_path
      ? supabase.storage.from("release_covers").getPublicUrl(row.release_cover_path).data.publicUrl
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

    const collabs = (trackArtistsMap?.[trackId] ?? []).map((artistItem) => ({
      id: String(artistItem.id),
      display_name: String(artistItem.display_name ?? "Unknown Artist"),
    }));

    const artists = uniqArtists([...owner, ...collabs]);

    const queueItem: HomeQueueTrack = {
      id: trackId,
      artist_id: artistId,
      status: "performance",
      title,
      version: meta?.version ?? null,
      is_explicit: !!meta?.is_explicit,
      cover_url: coverUrl,
      audio_url: audioUrl,
      audio_path: audioPath,
      profiles: { display_name: artistName },
      release_id: releaseId,
      release_track_id: rt?.release_track_id ?? null,
      rating_avg: rt?.rating_avg ?? (row.rating_avg ?? null),
      rating_count: rt?.rating_count ?? (row.rating_count ?? 0),
      stream_count: rt?.stream_count ?? (row.streams_30d ?? 0),
      bpm: perfTrackMetaMap?.[trackId]?.bpm ?? null,
      key: perfTrackMetaMap?.[trackId]?.key ?? null,
      artists,
    };

    return queueItem;
  });
}
