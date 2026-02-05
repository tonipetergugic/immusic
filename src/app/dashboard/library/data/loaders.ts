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

  const artistIds = Array.from(new Set((rows ?? []).map((r: any) => r.artist_id))).filter(Boolean);

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

  return (profiles ?? []) as any;
}

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
        bpm,
        key,
        genre,
        profiles:profiles!tracks_artist_id_fkey(
          id,
          display_name,
          avatar_url
        ),
        release_tracks:release_tracks!release_tracks_track_id_fkey(
          id,
          release_id,
          rating_avg,
          rating_count,
          stream_count
        ),
        releases:releases!tracks_release_id_fkey(
          id,
          cover_path
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

  const normalizedTracks =
    (savedRows ?? [])
      .map((row: any) => {
        const t = row.tracks;
        if (!t) return null;

        const rt = Array.isArray(t.release_tracks) ? t.release_tracks[0] ?? null : t.release_tracks ?? null;
        const release = Array.isArray(t.releases) ? t.releases[0] ?? null : t.releases ?? null;

        const { data: audio } = supabase.storage.from("tracks").getPublicUrl(String(t.audio_path ?? ""));
        const audio_url = audio?.publicUrl ?? null;

        const cover_url = release?.cover_path
          ? supabase.storage.from("release_covers").getPublicUrl(release.cover_path).data.publicUrl ?? null
          : null;

        // Do NOT throw in v2 – keep it resilient.
        return {
          id: t.id,
          title: t.title ?? null,
          version: t.version ?? null,
          artist_id: t.artist_id ?? null,
          audio_url,
          cover_url,
          bpm: t.bpm ?? null,
          key: t.key ?? null,
          genre: t.genre ?? null,
          profiles: t.profiles ?? null,
          release_track_id: rt?.id ?? null,
          release_id: rt?.release_id ?? null,

          // rating summary (from release_tracks)
          rating_avg: rt?.rating_avg ?? null,
          rating_count: rt?.rating_count ?? 0,
          stream_count: rt?.stream_count ?? 0,
        };
      })
      .filter(Boolean) ?? [];

  // Ensure unique keys by track.id
  const unique = Array.from(new Map((normalizedTracks as any[]).map((t) => [String(t.id), t])).values());

  const releaseTrackIdByTrackId: Record<string, string> = {};
  const ratingByReleaseTrackId: Record<string, { avg: number | null; count: number; streams: number }> = {};

  const trackIds: string[] = [];
  const releaseTrackIds: string[] = [];

  for (const t of unique as any[]) {
    const tid = String(t?.id ?? "");
    if (tid) trackIds.push(tid);

    if (t?.id && t?.release_track_id) {
      const rid = String(t.release_track_id);
      releaseTrackIdByTrackId[tid] = rid;
      releaseTrackIds.push(rid);

      ratingByReleaseTrackId[rid] = {
        avg: (t as any).rating_avg ?? null,
        count: (t as any).rating_count ?? 0,
        streams: (t as any).stream_count ?? 0,
      };
    }
  }

  // Map: release_track_id -> my latest stars
  const myStarsByReleaseTrackId: Record<string, number | null> = {};
  if (releaseTrackIds.length > 0) {
    const { data: myRows, error: myErr } = await supabase
      .from("track_ratings")
      .select("release_track_id, stars, created_at")
      .eq("user_id", userId)
      .in("release_track_id", releaseTrackIds)
      .order("created_at", { ascending: false });

    if (myErr) {
      console.error("LibraryV2: Failed to load my track_ratings (batch):", myErr);
    } else {
      for (const r of myRows ?? []) {
        const rid = String((r as any).release_track_id ?? "");
        if (!rid) continue;
        // first wins due to sort desc
        if (myStarsByReleaseTrackId[rid] === undefined) {
          myStarsByReleaseTrackId[rid] = (r as any).stars ?? null;
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
      for (const r of lsRows ?? []) {
        const tid = String((r as any).track_id ?? "");
        if (!tid) continue;
        eligibilityByTrackId[tid] = {
          can_rate: (r as any).can_rate ?? null,
          listened_seconds: (r as any).listened_seconds ?? null,
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
      for (const r of winRows ?? []) {
        const tid = String((r as any).track_id ?? "");
        if (!tid) continue;
        const inWindow = Boolean((r as any).in_window);
        const windowOpen = Boolean((r as any).window_open);
        // match eligibility API intention: must be in window AND open
        windowOpenByTrackId[tid] = inWindow && windowOpen;
      }
    }
  }

  // --- SAFETY: skip tracks that have no audio_url (toPlayerTrack would throw) ---
  const safeUnique = (unique as any[]).filter((t) => {
    const audioUrl = (t as any)?.audio_url;
    if (!audioUrl) {
      if (process.env.NODE_ENV !== "production") {
        console.error("LibraryV2: skipping track with missing audio_url/audio_path", {
          trackId: (t as any)?.id ?? null,
          userId,
        });
      }
      return false;
    }
    return true;
  });

  const tracks = toPlayerTrackList(safeUnique as any);

  return {
    tracks,
    releaseTrackIdByTrackId,
    ratingByReleaseTrackId,
    myStarsByReleaseTrackId,
    eligibilityByTrackId,
    windowOpenByTrackId,
  };
}
