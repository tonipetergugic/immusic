import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlayerTrack } from "@/types/playerTrack";
import { toPlayerTrackList } from "@/lib/playerTrack";

type LibraryTrackProfileRow = {
  id: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type LibraryReleaseRow = {
  id: string | null;
  cover_path: string | null;
};

type LibraryReleaseTrackRow = {
  id: string | null;
  release_id: string | null;
  releases: LibraryReleaseRow | LibraryReleaseRow[] | null;
};

type LibraryTrackSourceRow = {
  id: string | null;
  title: string | null;
  version: string | null;
  audio_path: string | null;
  created_at: string | null;
  artist_id: string | null;
  status: string | null;
  is_explicit: boolean | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  profiles: LibraryTrackProfileRow | LibraryTrackProfileRow[] | null;
  release_tracks: LibraryReleaseTrackRow | LibraryReleaseTrackRow[] | null;
};

type LibraryTrackSavedRow = {
  track_id: string | null;
  created_at: string | null;
  tracks: LibraryTrackSourceRow | LibraryTrackSourceRow[] | null;
};

type LibraryTrackNormalized = {
  id: string;
  title: string | null;
  version: string | null;
  artist_id: string | null;
  status: string | null;
  is_explicit: boolean;
  audio_url: string | null;
  cover_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  profiles: LibraryTrackProfileRow | LibraryTrackProfileRow[] | null;
  release_id: string | null;
  rating_avg: number | null;
  rating_count: number;
  stream_count: number;
};

type AnalyticsTrackLifetimeRow = {
  track_id: string | null;
  streams_lifetime: number | null;
};

type MyTrackRatingRow = {
  track_id: string | null;
  stars: number | null;
  created_at: string | null;
};

type TrackListenStateRow = {
  track_id: string | null;
  can_rate: boolean | null;
  listened_seconds: number | null;
};

type RatingsWindowTrackRow = {
  track_id: string | null;
  window_open: boolean | null;
  in_window: boolean | null;
};

type TrackArtistsResolvedRow = {
  track_id: string | null;
  artists:
    | {
        id: string | null;
        display_name: string | null;
      }[]
    | null;
};

export async function loadLibraryV2Tracks({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{
  tracks: PlayerTrack[];
  ratingByTrackId: Record<string, { avg: number | null; count: number; streams: number }>;
  myStarsByTrackId: Record<string, number | null>;
  eligibilityByTrackId: Record<string, { can_rate: boolean | null; listened_seconds: number | null }>;
  windowOpenByTrackId: Record<string, boolean | null>;
}> {
  const { data: savedRows, error } = await supabase
    .from("library_tracks")
    .select(
      `
      track_id,
      created_at,
      tracks:tracks!library_tracks_track_id_fkey(
        id,
        title,
        version,
        audio_path,
        created_at,
        artist_id,
        status,
        is_explicit,
        bpm,
        key,
        genre,
        rating_avg,
        rating_count,
        profiles:profiles!tracks_artist_id_fkey(
          id,
          display_name,
          avatar_url
        ),
        release_tracks:release_tracks!release_tracks_track_id_fkey(
          id,
          release_id,
          releases:releases!release_tracks_release_id_fkey(
            id,
            cover_path
          )
        )
      )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LibraryV2: Failed to load library_tracks:", error);
    return {
      tracks: [],
      ratingByTrackId: {},
      myStarsByTrackId: {},
      eligibilityByTrackId: {},
      windowOpenByTrackId: {},
    };
  }

  const normalizedTracks =
    ((savedRows ?? []) as LibraryTrackSavedRow[])
      .map((row): LibraryTrackNormalized | null => {
        const trackSource = Array.isArray(row.tracks)
          ? (row.tracks[0] ?? null)
          : (row.tracks ?? null);

        if (!trackSource?.id) return null;

        const releaseTrack = Array.isArray(trackSource.release_tracks)
          ? (trackSource.release_tracks[0] ?? null)
          : (trackSource.release_tracks ?? null);

        const release = Array.isArray(releaseTrack?.releases)
          ? (releaseTrack.releases[0] ?? null)
          : (releaseTrack?.releases ?? null);

        const { data: audio } = supabase.storage
          .from("tracks")
          .getPublicUrl(String(trackSource.audio_path ?? ""));

        const audio_url = audio?.publicUrl ?? null;

        const cover_url = release?.cover_path
          ? supabase.storage
              .from("release_covers")
              .getPublicUrl(release.cover_path).data.publicUrl ?? null
          : null;

        return {
          id: String(trackSource.id),
          title: trackSource.title ?? null,
          version: trackSource.version ?? null,
          artist_id: trackSource.artist_id ?? null,
          status: trackSource.status ?? null,
          is_explicit: trackSource.is_explicit ?? false,
          audio_url,
          cover_url,
          bpm: trackSource.bpm ?? null,
          key: trackSource.key ?? null,
          genre: trackSource.genre ?? null,
          profiles: trackSource.profiles ?? null,
          release_id: releaseTrack?.release_id ? String(releaseTrack.release_id) : null,
          rating_avg: trackSource.rating_avg ?? null,
          rating_count: trackSource.rating_count ?? 0,
          stream_count: 0,
        };
      })
      .filter((track): track is LibraryTrackNormalized => Boolean(track));

  const unique = Array.from(
    new Map(normalizedTracks.map((track) => [String(track.id), track])).values()
  );

  const visibleUnique = unique;

  const safeUnique = visibleUnique.filter(
    (track): track is LibraryTrackNormalized & { audio_url: string } => {
      if (!track.audio_url) {
        if (process.env.NODE_ENV !== "production") {
          console.error("LibraryV2: skipping track with missing audio_url/audio_path", {
            trackId: track.id ?? null,
            userId,
          });
        }
        return false;
      }
      return true;
    }
  );

  const trackIds = Array.from(new Set(safeUnique.map((track) => String(track.id)).filter(Boolean)));

  let lifetimeStreamsByTrackId = new Map<string, number>();

  if (trackIds.length > 0) {
    const { data: lifetimeRows, error: lifetimeErr } = await supabase
      .from("analytics_track_lifetime")
      .select("track_id, streams_lifetime")
      .in("track_id", trackIds);

    if (lifetimeErr) {
      console.error("LibraryV2: Failed to load analytics_track_lifetime:", lifetimeErr);
    } else {
      lifetimeStreamsByTrackId = new Map(
        ((lifetimeRows ?? []) as AnalyticsTrackLifetimeRow[]).map((row) => [
          String(row.track_id),
          typeof row.streams_lifetime === "number" ? row.streams_lifetime : 0,
        ])
      );
    }
  }

  const ratingByTrackId: Record<string, { avg: number | null; count: number; streams: number }> = {};

  for (const track of safeUnique) {
    const trackId = String(track.id ?? "");
    if (!trackId) continue;

    ratingByTrackId[trackId] = {
      avg: track.rating_avg ?? null,
      count: track.rating_count ?? 0,
      streams: lifetimeStreamsByTrackId.get(trackId) ?? 0,
    };
  }

  const myStarsByTrackId: Record<string, number | null> = {};
  if (trackIds.length > 0) {
    const { data: myRows, error: myErr } = await supabase
      .from("track_ratings")
      .select("track_id, stars, created_at")
      .eq("user_id", userId)
      .in("track_id", trackIds)
      .order("created_at", { ascending: false });

    if (myErr) {
      console.error("LibraryV2: Failed to load my track_ratings (batch):", myErr);
    } else {
      for (const row of (myRows ?? []) as MyTrackRatingRow[]) {
        const trackId = String(row.track_id ?? "");
        if (!trackId) continue;

        if (myStarsByTrackId[trackId] === undefined) {
          myStarsByTrackId[trackId] = row.stars ?? null;
        }
      }
    }
  }

  const eligibilityByTrackId: Record<string, { can_rate: boolean | null; listened_seconds: number | null }> = {};
  if (trackIds.length > 0) {
    const { data: lsRows, error: lsErr } = await supabase
      .from("track_listen_state")
      .select("track_id, can_rate, listened_seconds")
      .eq("user_id", userId)
      .in("track_id", trackIds);

    if (lsErr) {
      console.error("LibraryV2: Failed to load track_listen_state (batch):", lsErr);
    } else {
      for (const row of (lsRows ?? []) as TrackListenStateRow[]) {
        const trackId = String(row.track_id ?? "");
        if (!trackId) continue;

        eligibilityByTrackId[trackId] = {
          can_rate: row.can_rate ?? null,
          listened_seconds: row.listened_seconds ?? null,
        };
      }
    }
  }

  const windowOpenByTrackId: Record<string, boolean | null> = {};

  if (trackIds.length > 0) {
    const { data: winRows, error: winErr } = await supabase
      .from("ratings_window_tracks")
      .select("track_id, window_open, in_window")
      .in("track_id", trackIds);

    if (winErr) {
      console.error("LibraryV2: Failed to load ratings_window_tracks (batch):", winErr);
    } else {
      for (const row of (winRows ?? []) as RatingsWindowTrackRow[]) {
        const trackId = String(row.track_id ?? "");
        if (!trackId) continue;

        const inWindow = Boolean(row.in_window);
        const windowOpen = Boolean(row.window_open);
        windowOpenByTrackId[trackId] = inWindow && windowOpen;
      }
    }
  }

  const trackArtistsByTrackId: Record<
    string,
    { id: string; display_name: string }[]
  > = {};

  if (trackIds.length > 0) {
    const { data: artistRows, error: artistRowsErr } = await supabase
      .from("track_artists_resolved")
      .select("track_id, artists")
      .in("track_id", trackIds);

    if (artistRowsErr) {
      console.error(
        "LibraryV2: Failed to load track_artists_resolved:",
        artistRowsErr
      );
    } else {
      for (const row of (artistRows ?? []) as TrackArtistsResolvedRow[]) {
        const trackId = String(row.track_id ?? "");
        if (!trackId) continue;

        trackArtistsByTrackId[trackId] = Array.isArray(row.artists)
          ? row.artists
              .map((artist) => {
                const artistId = String(artist?.id ?? "");
                if (!artistId) return null;

                return {
                  id: artistId,
                  display_name: String(
                    artist?.display_name ?? "Unknown Artist"
                  ),
                };
              })
              .filter(
                (
                  artist
                ): artist is { id: string; display_name: string } => artist !== null
              )
          : [];
      }
    }
  }

  const tracks = toPlayerTrackList(safeUnique).map((track) => {
    const source = safeUnique.find((item) => String(item.id) === String(track.id));

    return {
      ...track,
      release_id: source?.release_id ?? null,
      rating_avg: source?.rating_avg ?? null,
      rating_count: source?.rating_count ?? 0,
      stream_count: lifetimeStreamsByTrackId.get(String(track.id)) ?? 0,
      artists: trackArtistsByTrackId[String(track.id)] ?? [],
    };
  });

  return {
    tracks,
    ratingByTrackId,
    myStarsByTrackId,
    eligibilityByTrackId,
    windowOpenByTrackId,
  };
}
