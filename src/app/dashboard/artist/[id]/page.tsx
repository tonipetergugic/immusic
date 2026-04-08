import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ArtistClient from "./ArtistClient";
import type { ArtistPageDto, TopTrackDto } from "./_types/artistPageDto";

type ArtistProfileRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  banner_url: string | null;
  banner_pos_y: number | null;
  avatar_url: string | null;
  avatar_pos_x: number | null;
  avatar_pos_y: number | null;
  avatar_zoom: number | null;
  updated_at: string | null;
};

type ExplicitReleaseRow = {
  release_id: string | null;
  tracks:
    | { is_explicit: boolean | null }
    | { is_explicit: boolean | null }[]
    | null;
};

type ExplicitTrackRow = {
  id: string | null;
  is_explicit: boolean | null;
};

type ArtistCollaboratorRow = {
  artist_id: string | null;
  display_name: string | null;
};

type ArtistMembershipRow = {
  track_id: string | null;
};

export default async function ArtistV2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: artistId } = await params;
  if (!artistId) return notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const shareUrl = host
    ? `${proto}://${host}/dashboard/artist/${artistId}`
    : `/dashboard/artist/${artistId}`;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerId = user?.id ?? null;

  // A) Artist Core (Guard)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, bio, city, country, instagram, tiktok, facebook, x, banner_url, banner_pos_y, avatar_url, avatar_pos_x, avatar_pos_y, avatar_zoom, updated_at"
    )
    .eq("id", artistId)
    .single();

  if (profileError || !profile) return notFound();

  const artistProfile = profile as ArtistProfileRow;

  // D) Releases (published)
  const { data: releasesData, error: releasesError } = await supabase
    .from("releases")
    .select("id, title, cover_path, release_type, created_at")
    .eq("artist_id", artistId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (releasesError) {
    // Hard fail vermeiden: Seite soll stabil bleiben.
    // Releases sind optionaler Content → fallback auf leeres Array.
  }

  const releaseIds = (releasesData ?? [])
    .map((r) => String(r.id))
    .filter(Boolean);

  const { data: explicitReleaseRows, error: explicitReleaseError } =
    releaseIds.length > 0
      ? await supabase
          .from("release_tracks")
          .select("release_id, tracks!inner(is_explicit)")
          .in("release_id", releaseIds)
          .eq("tracks.is_explicit", true)
      : { data: [], error: null };

  if (explicitReleaseError) {
    // optionaler Content → fallback ohne Filter
  }

  const explicitReleaseIds = new Set(
    ((explicitReleaseRows ?? []) as ExplicitReleaseRow[])
      .map((row) => String(row.release_id ?? ""))
      .filter(Boolean)
  );

  const releases = (releasesData ?? []).map((r) => {
      const coverUrl = r.cover_path
        ? supabase.storage.from("release_covers").getPublicUrl(r.cover_path).data
            .publicUrl
        : null;

      return {
        id: r.id,
        title: r.title ?? "Untitled",
        coverUrl,
        releaseType: r.release_type ?? null,
        createdAt: r.created_at,
        isExplicit: explicitReleaseIds.has(String(r.id)),
      };
    });

  // E) Playlists (public)
  const { data: playlistsData, error: playlistsError } = await supabase
    .from("playlists")
    .select("id, title, cover_url, created_at")
    .eq("created_by", artistId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (playlistsError) {
    // optionaler Content → fallback auf leer
  }

  const playlists = (playlistsData ?? []).map((p) => {
    const coverUrl = p.cover_url
      ? supabase.storage.from("playlist-covers").getPublicUrl(p.cover_url).data
          .publicUrl
      : null;

    return {
      id: p.id,
      title: p.title ?? "Untitled",
      coverUrl,
      createdAt: p.created_at,
    };
  });

  // F) Top Tracks (30d): 1) Ranking/Stats, 2) Resolved Details
  type TopTracksRow = {
    track_id: string;
    streams: number | null;
    unique_listeners: number | null;
    listened_seconds: number | null;
    ratings_count: number | null;
    rating_avg: number | null;
  };

  const { data: topTracksRaw, error: topTracksRawError } = await supabase
    .from("analytics_artist_top_tracks_30d")
    .select(
      `
      track_id,
      streams:streams_30d,
      unique_listeners:listeners_30d,
      listened_seconds:listened_seconds_30d,
      ratings_count:ratings_count_30d,
      rating_avg:rating_avg_30d
    `
    )
    .eq("artist_id", artistId)
    .order("streams_30d", { ascending: false })
    .limit(20);

  const topTracksRawApi: TopTracksRow[] =
    !topTracksRawError && Array.isArray(topTracksRaw)
      ? (topTracksRaw as TopTracksRow[])
      : [];

  const analyticsTrackIds = topTracksRawApi
    .map((t) => String(t.track_id ?? ""))
    .filter(Boolean);

  const { data: membershipTrackRows, error: membershipTrackRowsError } =
    await supabase
      .from("analytics_artist_track_memberships")
      .select("track_id")
      .eq("artist_id", artistId);

  if (membershipTrackRowsError) {
    // membership tracks sind optionaler Zusatzcontent → fallback ohne membership merge.
  }

  const collaboratorTrackIds = (
    (membershipTrackRows ?? []) as ArtistMembershipRow[]
  )
    .map((row) => String(row.track_id ?? ""))
    .filter(Boolean);

  const artistTrackIds = Array.from(
    new Set([...analyticsTrackIds, ...collaboratorTrackIds])
  );

  const { data: explicitTrackRows, error: explicitTrackError } =
    artistTrackIds.length > 0
      ? await supabase
          .from("tracks")
          .select("id, is_explicit")
          .in("id", artistTrackIds)
      : { data: [], error: null };

  if (explicitTrackError) {
    // Top tracks bleiben nutzbar, nur ohne explicit map fallback.
  }

  const explicitByTrackId = new Map<string, boolean>(
    ((explicitTrackRows ?? []) as ExplicitTrackRow[]).map((row) => [
      String(row.id),
      !!row.is_explicit,
    ])
  );

  type TopTrackResolvedRow = {
    track_id: string;
    release_id: string | null;
    track_title: string | null;
    track_version: string | null;
    bpm: number | null;
    key: string | null;
    genre: string | null;
    audio_path: string | null;
    release_title: string | null;
    cover_path: string | null;
    owner_id: string | null;
    owner_name: string | null;
    collaborators: ArtistCollaboratorRow[] | null;
    track_status: string | null;
  };

  let topTracksResolved: TopTrackResolvedRow[] = [];

  if (artistTrackIds.length > 0) {
    const { data, error } = await supabase
      .from("artist_top_tracks_resolved")
      .select(
        `
        track_id,
        release_id,
        track_title,
        track_version,
        bpm,
        key,
        genre,
        audio_path,
        release_title,
        cover_path,
        owner_id,
        owner_name,
        collaborators,
        track_status
      `
      )
      .in("track_id", artistTrackIds);

    if (!error && Array.isArray(data)) {
      topTracksResolved = data as TopTrackResolvedRow[];
    }
  }

  const detailsByTrackId = new Map<string, TopTrackResolvedRow>();
  for (const r of topTracksResolved) detailsByTrackId.set(r.track_id, r);

  const resolvedReleaseIds = Array.from(
    new Set(
      topTracksResolved
        .map((row) => String(row.release_id ?? ""))
        .filter(Boolean)
    )
  );

  const resolvedTrackIds = Array.from(
    new Set(
      topTracksResolved
        .map((row) => String(row.track_id ?? ""))
        .filter(Boolean)
    )
  );

  const { data: myRatingsRows, error: myRatingsError } =
    viewerId && resolvedTrackIds.length > 0
      ? await supabase
          .from("track_ratings")
          .select("track_id, stars")
          .eq("user_id", viewerId)
          .in("track_id", resolvedTrackIds)
      : { data: [], error: null };

  if (myRatingsError) {
    console.error("Failed to load artist-page user ratings:", myRatingsError);
  }

  const myStarsByTrackId = new Map<string, number | null>();

  for (const row of (myRatingsRows ?? []) as Array<{
    track_id: string | null;
    stars: number | null;
  }>) {
    const trackId = String(row.track_id ?? "");
    if (!trackId) continue;
    myStarsByTrackId.set(trackId, row.stars ?? null);
  }

  const { data: releaseTrackRows, error: releaseTrackRowsError } =
    resolvedReleaseIds.length > 0 && resolvedTrackIds.length > 0
      ? await supabase
          .from("release_tracks")
          .select("id, track_id, release_id")
          .in("release_id", resolvedReleaseIds)
          .in("track_id", resolvedTrackIds)
      : { data: [], error: null };

  if (releaseTrackRowsError) {
    // optional fallback: rating action on artist page stays hidden if release-track mapping is unavailable
  }

  const releaseTrackIdByPair = new Map<string, string>();
  for (const row of releaseTrackRows ?? []) {
    const trackId = String(row.track_id ?? "");
    const releaseId = String(row.release_id ?? "");
    const releaseTrackId = String(row.id ?? "");
    if (!trackId || !releaseId || !releaseTrackId) continue;
    const key = `${trackId}:${releaseId}`;
    if (!releaseTrackIdByPair.has(key)) {
      releaseTrackIdByPair.set(key, releaseTrackId);
    }
  }

  const buildTrackDto = (
    trackId: string,
    stats: TopTracksRow | null
  ): TopTrackDto | null => {
    const d = detailsByTrackId.get(trackId) ?? null;
    if (!d) return null;

    const audioUrl = d.audio_path
      ? supabase.storage.from("tracks").getPublicUrl(d.audio_path).data
          .publicUrl
      : null;

    if (!audioUrl) return null;

    const coverUrl = d.cover_path
      ? supabase.storage.from("release_covers").getPublicUrl(d.cover_path).data
          .publicUrl ?? null
      : null;

    const ownerId = String(d.owner_id ?? "");
    const ownerName = String(
      d.owner_name ?? artistProfile.display_name ?? "Unknown Artist"
    );

    const artists: Array<{ id: string; displayName: string }> = [];
    if (ownerId) artists.push({ id: ownerId, displayName: ownerName });

    const collabArr: ArtistCollaboratorRow[] = Array.isArray(d.collaborators)
      ? d.collaborators
      : [];

    for (const c of collabArr) {
      const cid = String(c?.artist_id ?? "");
      const cname = String(c?.display_name ?? "Unknown Artist");
      if (!cid) continue;
      if (!artists.some((x) => x.id === cid)) {
        artists.push({ id: cid, displayName: cname });
      }
    }

    const baseTitle = d.track_title ?? "Untitled";
    const version = (d.track_version ?? "").trim();
    const title = version ? `${baseTitle} (${version})` : baseTitle;

    return {
      trackId,
      releaseId: d.release_id ?? null,
      releaseTrackId: d.release_id
        ? releaseTrackIdByPair.get(`${trackId}:${d.release_id}`) ?? null
        : null,
      title,
      coverUrl,
      artists,
      audioUrl,
      status: d.track_status ?? null,
      isExplicit: explicitByTrackId.get(String(trackId)) ?? false,
      bpm: d.bpm ?? null,
      key: d.key ?? null,
      genre: d.genre ?? null,
      stats30d: {
        streams: stats?.streams ?? 0,
        listeners: stats?.unique_listeners ?? 0,
        listenedSeconds: stats?.listened_seconds ?? 0,
        ratingsCount: stats?.ratings_count ?? 0,
        ratingAvg: stats?.rating_avg ?? null,
      },
      my_stars: myStarsByTrackId.get(trackId) ?? null,
    };
  };

  const rankedTracks: TopTrackDto[] = topTracksRawApi
    .map((a) => buildTrackDto(a.track_id, a))
    .filter((x): x is TopTrackDto => x !== null);

  const analyticsTrackIdSet = new Set(analyticsTrackIds);

  const collaboratorFallbackTracks: TopTrackDto[] = artistTrackIds
    .filter((trackId) => !analyticsTrackIdSet.has(trackId))
    .map((trackId) => buildTrackDto(trackId, null))
    .filter((x): x is TopTrackDto => x !== null);

  const visibleRankedTracks = rankedTracks;

  const visibleCollaboratorFallbackTracks = collaboratorFallbackTracks;

  const topTracks: TopTrackDto[] = visibleRankedTracks.slice(0, 5);
  const allTracks: TopTrackDto[] = [
    ...visibleRankedTracks.slice(5, 20),
    ...visibleCollaboratorFallbackTracks,
  ].slice(0, 15);

  // B) Viewer Context
  const isSelf = !!viewerId && viewerId === artistId;

  const canFollow = !!viewerId && !isSelf;
  const canSave = !!viewerId;

  // C) Initial States (conditional)
  const [followStateRes, saveStateRes] = await Promise.all([
    canFollow
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewerId!)
          .eq("following_id", artistId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    canSave
      ? supabase
          .from("library_artists")
          .select("artist_id")
          .eq("user_id", viewerId!)
          .eq("artist_id", artistId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const isFollowing =
    canFollow && !followStateRes.error && !!followStateRes.data;

  const isSaved = canSave && !saveStateRes.error && !!saveStateRes.data;

  // D) Counts (parallel)
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", artistId),

    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", artistId),
  ]);

  const followers = followersRes.count ?? 0;
  const following = followingRes.count ?? 0;

  const dto: ArtistPageDto = {
    artist: {
      id: artistProfile.id,
      displayName: artistProfile.display_name ?? "Unknown Artist",
      bio: artistProfile.bio ?? null,
      city: artistProfile.city ?? null,
      country: artistProfile.country ?? null,
      bannerUrl: artistProfile.banner_url ?? null,
      bannerPosY: artistProfile.banner_pos_y ?? 50,
      avatarUrl: (() => {
        const base = artistProfile.avatar_url ?? null;
        const updatedAt = artistProfile.updated_at ?? null;
        if (!base) return null;
        if (!updatedAt) return base;
        const sep = String(base).includes("?") ? "&" : "?";
        return `${base}${sep}v=${encodeURIComponent(String(updatedAt))}`;
      })(),
      avatarPosX: artistProfile.avatar_pos_x ?? 50,
      avatarPosY: artistProfile.avatar_pos_y ?? 50,
      avatarZoom: artistProfile.avatar_zoom ?? 120,
      socials: {
        instagram: artistProfile.instagram ?? null,
        tiktok: artistProfile.tiktok ?? null,
        facebook: artistProfile.facebook ?? null,
        x: artistProfile.x ?? null,
      },
    },
    viewer: {
      id: viewerId,
      canFollow,
      canSave,
      isSelf,
    },
    initialStates: {
      isFollowing,
      isSaved,
    },
    counts: {
      followers,
      following,
    },
    releases,
    playlists,
    topTracks,
    allTracks,
  };

  return <ArtistClient dto={dto} shareUrl={shareUrl} />;
}
