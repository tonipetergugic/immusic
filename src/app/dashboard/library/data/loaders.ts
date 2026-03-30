import type { SupabaseClient } from "@supabase/supabase-js";
import type { Playlist, Profile } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";
import { buildPlaylistCoverUrlServer } from "@/lib/playlistCovers.server";
import { toPlayerTrackList } from "@/lib/playerTrack";

export async function loadLibraryV2Playlists({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<Playlist[]> {
  const { data: ownPlaylists, error: ownErr } = await supabase
    .from("playlists")
    .select("id")
    .eq("created_by", userId);

  if (ownErr) console.error("LibraryV2: Failed to load own playlists:", ownErr);

  const { data: savedPlaylists, error: savedErr } = await supabase
    .from("library_playlists")
    .select("playlist_id")
    .eq("user_id", userId);

  if (savedErr) console.error("LibraryV2: Failed to load saved playlists:", savedErr);

  const playlistIds = Array.from(
    new Set([...(ownPlaylists ?? []).map((p) => p.id), ...(savedPlaylists ?? []).map((p) => p.playlist_id)])
  );

  if (playlistIds.length === 0) return [];

  const { data: playlistsData, error } = await supabase
    .from("playlists")
    .select("*")
    .in("id", playlistIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("LibraryV2: Failed to load playlists:", error);
    return [];
  }

  return (playlistsData ?? []).map((p: any) => ({
    ...p,
    cover_url: buildPlaylistCoverUrlServer({ supabase, cover_path: p?.cover_url ?? null }),
  }));
}

type LibraryReleaseListItem = {
  id: string;
  title: string | null;
  coverUrl: string | null;
  releaseType: string | null;
  releaseDate: string | null;
  artistId: string | null;
  artistName: string | null;
};

type LibraryReleaseSavedRow = {
  release_id: string | null;
  saved_at: string | null;
};

type LibraryExplicitReleaseRow = {
  release_id: string | null;
};

type LibraryReleaseProfileRow = {
  display_name: string | null;
};

type LibraryReleaseSourceRow = {
  id: string | null;
  title: string | null;
  cover_path: string | null;
  release_type: string | null;
  release_date: string | null;
  artist_id: string | null;
  profiles: LibraryReleaseProfileRow | LibraryReleaseProfileRow[] | null;
};

export async function loadLibraryV2Releases({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<LibraryReleaseListItem[]> {
  const { data: rows, error } = await supabase
    .from("library_releases")
    .select("release_id, saved_at")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) {
    console.error("LibraryV2: Failed to load library_releases:", error);
    return [];
  }

  const releaseIds = Array.from(
    new Set(
      ((rows ?? []) as LibraryReleaseSavedRow[])
        .map((row) => row.release_id)
        .filter((releaseId): releaseId is string => Boolean(releaseId))
    )
  );

  if (releaseIds.length === 0) return [];

  let hideExplicitTracks = false;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("hide_explicit_tracks")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("LibraryV2: Failed to load explicit preference for releases:", profileErr);
  } else {
    hideExplicitTracks = !!profile?.hide_explicit_tracks;
  }

  let visibleReleaseIds = releaseIds;

  if (hideExplicitTracks) {
    const { data: explicitRows, error: explicitErr } = await supabase
      .from("release_tracks")
      .select("release_id, tracks!inner(is_explicit)")
      .in("release_id", releaseIds)
      .eq("tracks.is_explicit", true);

    if (explicitErr) {
      console.error("LibraryV2: Failed to filter explicit releases:", explicitErr);
    } else {
      const blockedReleaseIds = new Set(
        ((explicitRows ?? []) as LibraryExplicitReleaseRow[])
          .map((row) => row.release_id)
          .filter((releaseId): releaseId is string => Boolean(releaseId))
          .map((releaseId) => String(releaseId))
      );

      visibleReleaseIds = releaseIds.filter((id) => !blockedReleaseIds.has(String(id)));
    }
  }

  if (visibleReleaseIds.length === 0) return [];

  const { data: releases, error: releasesErr } = await supabase
    .from("releases")
    .select(
      `
      id,
      title,
      cover_path,
      release_type,
      release_date,
      artist_id,
      profiles:artist_id (
        display_name
      )
      `
    )
    .in("id", visibleReleaseIds);

  if (releasesErr) {
    console.error("LibraryV2: Failed to load releases:", releasesErr);
    return [];
  }

  const byId = new Map(
    ((releases ?? []) as LibraryReleaseSourceRow[])
      .filter((release): release is LibraryReleaseSourceRow & { id: string } => Boolean(release.id))
      .map((release) => {
        const profile = Array.isArray(release.profiles)
          ? (release.profiles[0] ?? null)
          : (release.profiles ?? null);

        const item: LibraryReleaseListItem = {
          id: String(release.id),
          title: release.title ?? null,
          coverUrl: release.cover_path
            ? supabase.storage
                .from("release_covers")
                .getPublicUrl(release.cover_path).data.publicUrl ?? null
            : null,
          releaseType: release.release_type ?? null,
          releaseDate: release.release_date ?? null,
          artistId: release.artist_id ?? null,
          artistName: profile?.display_name ?? null,
        };

        return [String(release.id), item] as const;
      })
  );

  return visibleReleaseIds
    .map((id) => byId.get(String(id)) ?? null)
    .filter((release): release is LibraryReleaseListItem => Boolean(release));
}

type LibraryArtistSavedRow = {
  artist_id: string | null;
};

export async function loadLibraryV2Artists({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<Profile[]> {
  const { data: rows, error } = await supabase
    .from("library_artists")
    .select("artist_id")
    .eq("user_id", userId);

  if (error) {
    console.error("LibraryV2: Failed to load library_artists:", error);
    return [];
  }

  const artistIds = Array.from(
    new Set(
      ((rows ?? []) as LibraryArtistSavedRow[])
        .map((row) => row.artist_id)
        .filter((artistId): artistId is string => Boolean(artistId))
    )
  );

  if (artistIds.length === 0) return [];

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", artistIds)
    .order("created_at", { ascending: false });

  if (pErr) {
    console.error("LibraryV2: Failed to load profiles:", pErr);
    return [];
  }

  return (profiles ?? []) as Profile[];
}

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
  release_track_id: string | null;
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

export async function loadLibraryV2Tracks({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{
  tracks: PlayerTrack[];
  releaseTrackIdByTrackId: Record<string, string>;
  ratingByReleaseTrackId: Record<string, { avg: number | null; count: number; streams: number }>;
  myStarsByReleaseTrackId: Record<string, number | null>;
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
      releaseTrackIdByTrackId: {},
      ratingByReleaseTrackId: {},
      myStarsByReleaseTrackId: {},
      eligibilityByTrackId: {},
      windowOpenByTrackId: {},
    };
  }

  let hideExplicitTracks = false;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("hide_explicit_tracks")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("LibraryV2: Failed to load explicit preference:", profileErr);
  } else {
    hideExplicitTracks = !!profile?.hide_explicit_tracks;
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
          release_track_id: releaseTrack?.id ? String(releaseTrack.id) : null,
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

  const visibleUnique = hideExplicitTracks
    ? unique.filter((track) => !track.is_explicit)
    : unique;

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

  const releaseTrackIdByTrackId: Record<string, string> = {};
  const ratingByReleaseTrackId: Record<string, { avg: number | null; count: number; streams: number }> = {};

  for (const track of safeUnique) {
    const trackId = String(track.id ?? "");
    if (!trackId) continue;

    if (track.release_track_id) {
      const releaseTrackId = String(track.release_track_id);
      releaseTrackIdByTrackId[trackId] = releaseTrackId;

      ratingByReleaseTrackId[releaseTrackId] = {
        avg: track.rating_avg ?? null,
        count: track.rating_count ?? 0,
        streams: lifetimeStreamsByTrackId.get(trackId) ?? 0,
      };
    }
  }

  // Map: track_id -> my latest stars (variable name kept temporarily for compatibility)
  const myStarsByReleaseTrackId: Record<string, number | null> = {};
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
        if (myStarsByReleaseTrackId[trackId] === undefined) {
          myStarsByReleaseTrackId[trackId] = row.stars ?? null;
        }
      }
    }
  }

  // Map: track_id -> eligibility
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

  // Map: track_id -> ratings window open (effective: in_window AND window_open)
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

  const tracks = toPlayerTrackList(safeUnique);

  return {
    tracks,
    releaseTrackIdByTrackId,
    ratingByReleaseTrackId,
    myStarsByReleaseTrackId,
    eligibilityByTrackId,
    windowOpenByTrackId,
  };
}
