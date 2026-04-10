import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Playlist, PlaylistTrack } from "@/types/database";
import type { PlayerTrack } from "@/types/playerTrack";
import { toPlayerTrack } from "@/lib/playerTrack";

import PlaylistClient from "./PlaylistClient";

const __DEV__ = process.env.NODE_ENV !== "production";

// --- v2: typed join DTOs (no any, no row mutation) ---
type ReleaseJoin = {
  status: string | null;
  cover_path: string | null;
  cover_preview_path: string | null;
};

type ArtistJoin = {
  id: string;
  display_name: string | null;
};

type TrackCollaboratorJoin = {
  role: string | null;
  profiles: {
    id: string;
    display_name: string | null;
  } | null;
};

type ReleaseTrackJoin = {
  id: string;
  release_id: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  stream_count: number | null;
};

type TrackJoin = {
  id: string;
  title: string | null;
  artist_id: string | null;
  release_id: string | null;

  // storage paths
  audio_path: string | null;

  bpm: number | null;
  key: string | null;
  genre: string | null;
  version: string | null;

  // joins (can be object or array depending on Supabase response shape)
  releases: ReleaseJoin | ReleaseJoin[] | null;
  artist: ArtistJoin | null;
  track_collaborators: TrackCollaboratorJoin[] | null;
  release_tracks: ReleaseTrackJoin | ReleaseTrackJoin[] | null;

  // optional fields used by toPlayerTrack fallback logic
  profiles?: { display_name?: string | null } | { display_name?: string | null }[] | null;
  artist_profile?: { display_name?: string | null } | { display_name?: string | null }[] | null;
};

type PlaylistOwnerJoin = {
  id: string;
  display_name: string | null;
  role: "listener" | "artist" | "admin" | null;
};

type PlaylistJoin = import("@/types/database").Playlist & {
  owner: PlaylistOwnerJoin | null;
};

type PlaylistTrackRow = {
  playlist_track_id: string;
  playlist_id: string;
  position: number;

  track_id: string;
  title: string | null;
  artist_id: string | null;
  track_status: string | null;
  release_id: string | null;

  audio_path: string | null;
  duration: number | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  version: string | null;

  release_status: string | null;
  release_cover_path: string | null;
  release_cover_preview_path: string | null;

  rating_avg: number | null;
  rating_count: number | null;
  stream_count: number | null;

  artist_profile_id: string | null;
  artist_display_name: string | null;
};

type ExplicitTrackRow = {
  id: string;
  is_explicit: boolean | null;
};

type TrackListenStateRow = {
  track_id: string;
  listened_seconds: number | null;
  can_rate: boolean | null;
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

type CollabArtist = { id: string; display_name: string };

type TrackCollaboratorVM = {
  role: string | null;
  position: number | null;
  profiles: {
    id: string;
    display_name: string | null;
  } | null;
};

function parseTrackCollaborators(val: unknown): TrackCollaboratorVM[] {
  if (!val || typeof val !== "object") return [];
  if (Array.isArray(val)) {
    return val as TrackCollaboratorVM[];
  }
  // if it's a jsonb value coming as object (rare), try best-effort:
  return [];
}

// helpers to normalize Supabase "object or array" join shapes
function firstOrNull<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

function toArray<T>(val: T | T[] | null | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export default async function PlaylistPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Playlist laden
  const { data: playlist } = await supabase
    .from("playlists")
    .select(
      `
      *,
      owner:profiles!playlists_created_by_fkey (
        id,
        display_name,
        role
      )
    `
    )
    .eq("id", id)
    .single<PlaylistJoin>();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canSavePlaylist = !!user?.id;

  let initialSaved = false;
  if (canSavePlaylist) {
    const { data: savedRow, error: savedErr } = await supabase
      .from("library_playlists")
      .select("playlist_id")
      .eq("user_id", user.id)
      .eq("playlist_id", id)
      .maybeSingle();

    if (savedErr) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to read library_playlists:", savedErr);
      }
      initialSaved = false;
    } else {
      initialSaved = !!savedRow;
    }
  }

  if (!playlist) {
    return <div className="p-6 text-white">Playlist not found.</div>;
  }

  const playlistCoverUrl =
    playlist.cover_url
      ? supabase.storage
          .from("playlist-covers")
          .getPublicUrl(playlist.cover_url).data.publicUrl ?? null
      : null;

  const playlistForClient: PlaylistJoin = {
    ...playlist,
    cover_url: playlistCoverUrl,
  };

  // Playlist-Tracks laden
  const { data: playlistTracks, error: playlistTracksError } = await supabase
    .from("playlist_tracks_resolved")
    .select(
      `
      playlist_track_id,
      playlist_id,
      position,
      track_id,
      title,
      artist_id,
      track_status,
      release_id,
      audio_path,
      duration,
      bpm,
      key,
      genre,
      version,
      release_status,
      release_cover_path,
      release_cover_preview_path,
      rating_avg,
      rating_count,
      stream_count,
      artist_profile_id,
      artist_display_name
    `
    )
    .eq("playlist_id", id)
    .order("position", { ascending: true })
    .returns<PlaylistTrackRow[]>();

  if (playlistTracksError) {
    throw playlistTracksError;
  }

  let visiblePlaylistTracks = playlistTracks ?? [];

  const playlistTrackIds = Array.from(
    new Set(visiblePlaylistTracks.map((row) => row.track_id).filter(Boolean))
  );

  const visibleTrackIds = Array.from(
    new Set(
      visiblePlaylistTracks
        .map((row) => String(row.track_id ?? ""))
        .filter(Boolean)
    )
  );

  const visibleReleaseIds = Array.from(
    new Set(
      visiblePlaylistTracks
        .map((row) => String(row.release_id ?? ""))
        .filter(Boolean)
    )
  );

  const [
    analyticsLifetimeRes,
    explicitRes,
    trackArtistsResolvedRes,
    releasePreviewRes,
  ] =
    playlistTrackIds.length > 0 ||
    visibleTrackIds.length > 0 ||
    visibleReleaseIds.length > 0
      ? await Promise.all([
          playlistTrackIds.length > 0
            ? supabase
                .from("analytics_track_lifetime")
                .select("track_id, streams_lifetime")
                .in("track_id", playlistTrackIds)
            : Promise.resolve({ data: [], error: null }),

          playlistTrackIds.length > 0
            ? supabase
                .from("tracks")
                .select("id, is_explicit")
                .in("id", playlistTrackIds)
            : Promise.resolve({ data: [], error: null }),

          visibleTrackIds.length > 0
            ? supabase
                .from("track_artists_resolved")
                .select("track_id, artists")
                .in("track_id", visibleTrackIds)
            : Promise.resolve({ data: [], error: null }),

          visibleReleaseIds.length > 0
            ? supabase
                .from("releases")
                .select("id, cover_preview_path")
                .in("id", visibleReleaseIds)
            : Promise.resolve({ data: [], error: null }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  const { data: analyticsLifetimeRows, error: analyticsLifetimeError } =
    analyticsLifetimeRes;

  if (analyticsLifetimeError) {
    throw analyticsLifetimeError;
  }

  const lifetimeRows: { track_id: string; streams_lifetime: number | null }[] =
    analyticsLifetimeRows ?? [];

  const lifetimeStreamsByTrackId = new Map(
    lifetimeRows.map((row) => [
      row.track_id,
      typeof row.streams_lifetime === "number" ? row.streams_lifetime : 0,
    ])
  );

  const { data: explicitRows, error: explicitError } = explicitRes;

  const { data: releasePreviewRows, error: releasePreviewError } = releasePreviewRes;

  if (releasePreviewError) {
    throw releasePreviewError;
  }

  const releasePreviewById = new Map(
    (releasePreviewRows ?? []).map((row: { id: string; cover_preview_path: string | null }) => [
      String(row.id),
      row.cover_preview_path ?? null,
    ])
  );

  if (explicitError) {
    console.error("Failed to load explicit flags for playlist tracks", explicitError);
  }

  const explicitTrackRows: ExplicitTrackRow[] = explicitRows ?? [];

  const explicitByTrackId = new Map<string, boolean>(
    explicitTrackRows.map((row) => [String(row.id), !!row.is_explicit])
  );

  const { data: resolvedArtistRows, error: resolvedArtistRowsError } =
    trackArtistsResolvedRes;

  if (resolvedArtistRowsError) {
    throw resolvedArtistRowsError;
  }

  const trackArtistsResolvedRows: TrackArtistsResolvedRow[] =
    resolvedArtistRows ?? [];

  const trackArtistsByTrackId = new Map<string, CollabArtist[]>();

  for (const row of trackArtistsResolvedRows) {
    const trackId = String(row.track_id ?? "");
    if (!trackId) continue;

    const artists = Array.isArray(row.artists)
      ? row.artists
          .map((artist) => {
            const artistId = String(artist?.id ?? "");
            if (!artistId) return null;

            return {
              id: artistId,
              display_name: String(artist?.display_name ?? ""),
            };
          })
          .filter((artist): artist is CollabArtist => Boolean(artist))
      : [];

    trackArtistsByTrackId.set(trackId, artists);
  }

  const convertedTracks: PlayerTrack[] = visiblePlaylistTracks.flatMap((row) => {
    const preferredCoverPath =
      releasePreviewById.get(String(row.release_id ?? "")) ??
      row.release_cover_preview_path ??
      row.release_cover_path ??
      null;

    const cover_url =
      preferredCoverPath
        ? supabase.storage
            .from("release_covers")
            .getPublicUrl(preferredCoverPath).data.publicUrl ?? null
        : null;

    const audio_url =
      row.audio_path
        ? supabase.storage.from("tracks").getPublicUrl(row.audio_path).data.publicUrl
        : null;

    if (!audio_url) {
      if (__DEV__) {
        console.error("PlaylistPage: skipping track with missing audio_path", {
          playlistId: id,
          trackId: row.track_id,
        });
      }
      return [];
    }

    const playerTrack = toPlayerTrack({
      id: row.track_id,
      title: row.title ?? null,
      artist_id: row.artist_id ?? null,
      status: row.track_status ?? null,
      is_explicit: explicitByTrackId.get(String(row.track_id)) ?? false,
      audio_url,
      cover_url,
      duration_seconds: row.duration ?? null,
      bpm: row.bpm ?? null,
      key: row.key ?? null,
      genre: row.genre ?? null,
      version: row.version ?? null,
      // provide a profile-like source for display_name
      artist_profile: row.artist_profile_id
        ? [{ display_name: row.artist_display_name ?? null }]
        : null,
    });

    const fallbackOwnerArtists = row.artist_profile_id
      ? [
          {
            id: String(row.artist_profile_id),
            display_name: String(row.artist_display_name ?? ""),
          },
        ]
      : [];

    const artists =
      trackArtistsByTrackId.get(String(row.track_id ?? "")) ?? fallbackOwnerArtists;

    return [{
      ...playerTrack,
      artists,
      release_id: row.release_id ?? null,
      rating_avg: row.rating_avg ?? null,
      rating_count: row.rating_count ?? 0,
      stream_count:
        lifetimeStreamsByTrackId.get(String(row.track_id ?? "")) ?? 0,
      track_collaborators: [],
      artist: null,
    }];
  });

  const trackIds = convertedTracks
    .map((t) => t.id)
    .filter(Boolean) as string[];

  let finalTracks = convertedTracks.map((t) => ({
    ...t,
    eligibility: {
      window_open: true,
      can_rate: false,
      listened_seconds: 0,
    },
  }));

  if (user && trackIds.length > 0) {
    const [{ data: myRatings, error: myRatingsError }, { data: listenStateRows, error: listenStateError }] =
      await Promise.all([
        supabase
          .from("track_ratings")
          .select("track_id, stars")
          .eq("user_id", user.id)
          .in("track_id", trackIds),
        supabase
          .from("track_listen_state")
          .select("track_id, listened_seconds, can_rate")
          .eq("user_id", user.id)
          .in("track_id", trackIds),
      ]);

    if (myRatingsError) {
      console.error("Failed to load user ratings", myRatingsError);
    }

    if (listenStateError) {
      console.error("Failed to load track listen state", listenStateError);
    }

    const myRatingMap = new Map(
      myRatings?.map((r) => [r.track_id, r.stars]) ?? []
    );

    const listenStateMap = new Map(
      ((listenStateRows ?? []) as TrackListenStateRow[]).map((row) => [
        row.track_id,
        {
          can_rate: typeof row.can_rate === "boolean" ? row.can_rate : false,
          listened_seconds:
            typeof row.listened_seconds === "number" ? row.listened_seconds : 0,
        },
      ])
    );

    finalTracks = convertedTracks.map((t) => {
      const listenState = listenStateMap.get(t.id);

      return {
        ...t,
        my_stars: myRatingMap.get(t.id) ?? null,
        eligibility: {
          window_open: true,
          can_rate: listenState?.can_rate ?? false,
          listened_seconds: listenState?.listened_seconds ?? 0,
        },
      };
    });
  }

  const initialExistingTrackIds = Array.from(
    new Set(
      visiblePlaylistTracks
        .map((row) => String(row.track_id ?? ""))
        .filter(Boolean)
    )
  );

  return (
    <div className="flex w-full overflow-x-hidden touch-pan-y min-w-0">
      {/* Content */}
      <div className="flex-1 min-w-0 w-full flex flex-col pt-4 pb-2">

        {/* Trackliste scrollt NICHT separat → gehört zum globalen Scroll */}
        <div className="min-w-0">
          <PlaylistClient
            playlist={playlistForClient}
            initialPlayerTracks={finalTracks}
            initialExistingTrackIds={initialExistingTrackIds}
            user={user}
            initialSaved={initialSaved}
          />
        </div>

      </div>
    </div>
  );
}
