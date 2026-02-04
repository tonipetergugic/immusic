import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ArtistClient from "./ArtistClient";
import type { ArtistPageDto, TopTrackDto } from "./_types/artistPageDto";

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

  // A) Artist Core (Guard)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, bio, city, country, instagram, tiktok, facebook, x, banner_url, banner_pos_y, avatar_url, updated_at"
    )
    .eq("id", artistId)
    .single();

  if (profileError || !profile) return notFound();

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
    .limit(10);

  const topTracksRawApi: TopTracksRow[] =
    !topTracksRawError && Array.isArray(topTracksRaw)
      ? (topTracksRaw as TopTracksRow[])
      : [];

  const topTrackIds = topTracksRawApi.map((t) => t.track_id).filter(Boolean);

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
    collaborators: any; // jsonb array
  };

  let topTracksResolved: TopTrackResolvedRow[] = [];

  if (topTrackIds.length > 0) {
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
        collaborators
      `
      )
      .in("track_id", topTrackIds);

    if (!error && Array.isArray(data)) {
      topTracksResolved = data as TopTrackResolvedRow[];
    }
  }

  const detailsByTrackId = new Map<string, TopTrackResolvedRow>();
  for (const r of topTracksResolved) detailsByTrackId.set(r.track_id, r);

  const topTracks: TopTrackDto[] = topTracksRawApi
    .map((a): TopTrackDto | null => {
      const d = detailsByTrackId.get(a.track_id) ?? null;
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
        d.owner_name ?? profile.display_name ?? "Unknown Artist"
      );

      const artists: Array<{ id: string; displayName: string }> = [];
      if (ownerId) artists.push({ id: ownerId, displayName: ownerName });

      const collabArr = Array.isArray(d.collaborators) ? d.collaborators : [];
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
        trackId: a.track_id,
        releaseId: d.release_id ?? null,
        title,
        coverUrl,
        artists,
        audioUrl,
        bpm: d.bpm ?? null,
        key: (d.key ?? null),
        genre: (d.genre ?? null),
        stats30d: {
          streams: a.streams ?? 0,
          listeners: a.unique_listeners ?? 0,
          listenedSeconds: a.listened_seconds ?? 0,
          ratingsCount: a.ratings_count ?? 0,
          ratingAvg: a.rating_avg ?? null,
        },
      };
    })
    .filter((x): x is TopTrackDto => x !== null);

  // B) Viewer Context
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerId = user?.id ?? null;
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
      : Promise.resolve({ data: null, error: null } as any),

    canSave
      ? supabase
          .from("library_artists")
          .select("artist_id")
          .eq("user_id", viewerId!)
          .eq("artist_id", artistId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
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
      id: profile.id,
      displayName: profile.display_name ?? "Unknown Artist",
      bio: profile.bio ?? null,
      city: (profile as any).city ?? null,
      country: (profile as any).country ?? null,
      bannerUrl: (profile as any).banner_url ?? null,
      bannerPosY: (profile as any).banner_pos_y ?? 50,
      avatarUrl: (() => {
        const base = (profile as any).avatar_url ?? null;
        const updatedAt = (profile as any).updated_at ?? null;
        if (!base) return null;
        if (!updatedAt) return base;
        const sep = String(base).includes("?") ? "&" : "?";
        return `${base}${sep}v=${encodeURIComponent(String(updatedAt))}`;
      })(),
      socials: {
        instagram: profile.instagram ?? null,
        tiktok: profile.tiktok ?? null,
        facebook: profile.facebook ?? null,
        x: profile.x ?? null,
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
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <ArtistClient dto={dto} shareUrl={shareUrl} />
    </div>
  );
}
