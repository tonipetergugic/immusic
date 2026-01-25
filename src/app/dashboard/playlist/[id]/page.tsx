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
  release_id: string | null;

  audio_path: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  version: string | null;

  release_status: string | null;
  release_cover_path: string | null;

  release_track_id: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  stream_count: number | null;

  artist_profile_id: string | null;
  artist_display_name: string | null;
  track_collaborators: unknown;
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
  const { data: playlistTracks } = await supabase
    .from("playlist_tracks_resolved")
    .select(
      `
      playlist_track_id,
      playlist_id,
      position,
      track_id,
      title,
      artist_id,
      release_id,
      audio_path,
      bpm,
      key,
      genre,
      version,
      release_status,
      release_cover_path,
      release_track_id,
      rating_avg,
      rating_count,
      stream_count,
      artist_profile_id,
      artist_display_name,
      track_collaborators
    `
    )
    .eq("playlist_id", id)
    .order("position", { ascending: true })
    .returns<PlaylistTrackRow[]>();

  const convertedTracks: PlayerTrack[] = (playlistTracks ?? []).flatMap((row) => {
    const cover_url =
      row.release_cover_path
        ? supabase.storage
            .from("release_covers")
            .getPublicUrl(row.release_cover_path).data.publicUrl ?? null
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
          releaseTrackId: row.release_track_id ?? null,
        });
      }
      return [];
    }

    const playerTrack = toPlayerTrack({
      id: row.track_id,
      title: row.title ?? null,
      artist_id: row.artist_id ?? null,
      audio_url,
      cover_url,
      bpm: row.bpm ?? null,
      key: row.key ?? null,
      genre: row.genre ?? null,
      version: row.version ?? null,
      // provide a profile-like source for display_name
      artist_profile: row.artist_profile_id
        ? [{ display_name: row.artist_display_name ?? null }]
        : null,
    });

    const ownerArtist =
      row.artist_profile_id
        ? {
            id: String(row.artist_profile_id),
            display_name: String(row.artist_display_name ?? ""),
          }
        : null;

    const collaboratorsRaw = parseTrackCollaborators(row.track_collaborators)
      .map((c) => {
        const pr = c?.profiles;
        if (!pr?.id) return null;
        return {
          id: String(pr.id),
          display_name: String(pr.display_name ?? ""),
        };
      })
      .filter((x): x is CollabArtist => Boolean(x));

    const artistsRaw = [ownerArtist, ...collaboratorsRaw].filter(
      (x): x is CollabArtist => Boolean(x)
    );

    const artists = Array.from(new Map(artistsRaw.map((a) => [a.id, a])).values());

    return [{
      ...playerTrack,
      artists,
      release_id: row.release_id ?? null,
      release_track_id: row.release_track_id ?? null,
      rating_avg: row.rating_avg ?? null,
      rating_count: row.rating_count ?? 0,
      stream_count: row.stream_count ?? 0,
      track_collaborators: parseTrackCollaborators(row.track_collaborators),
      artist: null,
    }];
  });

  const releaseTrackIds = convertedTracks
    .map((t) => t.release_track_id)
    .filter(Boolean) as string[];

  let finalTracks = convertedTracks;

  if (user && releaseTrackIds.length > 0) {
    const { data: myRatings, error: myRatingsError } = await supabase
      .from("track_ratings")
      .select("release_track_id, stars")
      .eq("user_id", user.id)
      .in("release_track_id", releaseTrackIds);

    if (myRatingsError) {
      console.error("Failed to load user ratings", myRatingsError);
    } else {
      const myRatingMap = new Map(
        myRatings?.map((r) => [r.release_track_id, r.stars]) ?? []
      );

      finalTracks = convertedTracks.map((t) => ({
        ...t,
        my_stars: t.release_track_id
          ? myRatingMap.get(t.release_track_id) ?? null
          : null,
      }));
    }
  }

  return (
    <div className="flex w-full overflow-x-hidden touch-pan-y min-w-0">  
      {/* Linker Bereich */}
      <div className="flex-1 min-w-0 w-full flex flex-col pt-4 pb-2 max-w-[1500px] mx-auto">

        {/* Trackliste scrollt NICHT separat → gehört zum globalen Scroll */}
        <div className="min-w-0">
          <PlaylistClient
            playlist={playlistForClient}
            initialPlayerTracks={finalTracks}
            user={user}
            initialSaved={initialSaved}
          />
        </div>

      </div>
    </div>
  );
}
