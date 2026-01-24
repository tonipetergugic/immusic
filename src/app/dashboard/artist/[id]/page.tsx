import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Instagram, Facebook, Twitter, Music2 } from "lucide-react";
import SaveArtistButton from "./SaveArtistButton";
import ReleaseCard, { type ReleaseCardData } from "@/components/ReleaseCard";
import FollowArtistButton from "./FollowArtistButton";
import PlaylistCard from "@/components/PlaylistCard";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import TrackRowBase from "@/components/TrackRowBase";
import { toPlayerTrack } from "@/lib/playerTrack";
import FollowCountsClient from "./FollowCountsClient";
import LibraryTrackArtists from "@/components/LibraryTrackArtists";

const __DEV__ = process.env.NODE_ENV !== "production";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) return notFound();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Single source of truth: profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (profileError || !profile) return notFound();

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", id),
  ]);

  const followerCountNum = followerCount ?? 0;
  const followingCountNum = followingCount ?? 0;

  const [
    { data: releases },
    { data: publicPlaylists },
    { data: releaseTracks },
  ] = await Promise.all([
    supabase
      .from("releases")
      .select("id, title, cover_path, release_type, status, created_at")
      .eq("artist_id", id)
      .eq("status", "published")
      .order("created_at", { ascending: false }),

    supabase
      .from("playlists")
      .select("id, title, cover_url, created_at")
      .eq("created_by", id)
      .eq("is_public", true)
      .order("created_at", { ascending: false }),

    supabase
      .from("release_tracks")
      .select(
        `
        id,
        release_id,
        position,
        track_title,
        tracks:tracks!release_tracks_track_id_fkey(
          id,
          title,
          audio_path,
          artist_id,
          version
        ),
        releases:releases!release_tracks_release_id_fkey(
          id,
          cover_path,
          title,
          status,
          artist_id
        )
      `
      )
      .eq("releases.artist_id", id)
      .eq("releases.status", "published"),
  ]);

  type TopTracksApiOk = {
    ok: true;
    tracks: Array<{
      track_id: string;
      streams: number | null;
      unique_listeners: number | null;
      listened_seconds: number | null;
      ratings_count: number | null;
      rating_avg: number | null;
    }>;
  };

  let topTracksRawApi: TopTracksApiOk["tracks"] = [];

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const origin = host ? `${proto}://${host}` : "";

    const url = `${origin}/api/artist/${id}/top-tracks`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const rawText = await res.text();

    let json: any = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch (e) {
      if (__DEV__) {
        console.error("Top tracks API returned non-JSON:", {
          status: res.status,
          statusText: res.statusText,
          body: rawText?.slice(0, 500) ?? "",
        });
      }
    }

    if (res.ok && json?.ok === true && Array.isArray(json.tracks)) {
      topTracksRawApi = json.tracks;
    } else {
      if (__DEV__) {
        console.error("Top tracks API failed:", {
          status: res.status,
          statusText: res.statusText,
          body: rawText?.slice(0, 500) ?? "",
          json,
        });
      }
    }
  } catch (e) {
    if (__DEV__) {
      console.error("Top tracks API error:", e);
    }
  }

  const topTrackIds = topTracksRawApi.map((r) => r.track_id);

  // TopTracks: load collaborators (multi-artist)
  let topTrackArtistsMap: Record<string, { id: string; display_name: string }[]> = {};

  if (topTrackIds.length > 0) {
    const { data: tcRows, error: tcErr } = await supabase
      .from("track_collaborators")
      .select(
        `
        track_id,
        position,
        profiles:profiles!track_collaborators_profile_id_fkey (
          id,
          display_name
        )
      `
      )
      .in("track_id", topTrackIds)
      .order("position", { ascending: true });

    if (!tcErr && tcRows) {
      const map: Record<string, { id: string; display_name: string }[]> = {};
      for (const row of tcRows as any[]) {
        const tid = row?.track_id;
        const p = row?.profiles;
        if (!tid || !p?.id) continue;

        if (!map[tid]) map[tid] = [];
        if (!map[tid].some((a) => a.id === String(p.id))) {
          map[tid].push({
            id: String(p.id),
            display_name: String(p.display_name ?? "Unknown Artist"),
          });
        }
      }
      topTrackArtistsMap = map;
    }
  }

  // Merge owner into artists list so we always show: owner, collabs...
  const topTrackArtistsMergedMap: Record<string, { id: string; display_name: string }[]> = {};

  let topTracksDetails: any[] = [];
  if (topTrackIds.length > 0) {
    const { data: rows } = await supabase
      .from("release_tracks")
      .select(`
        track_id,
        track_title,
        rating_avg,
        rating_count,
        tracks:tracks!release_tracks_track_id_fkey (
          id,
          title,
          audio_path,
          artist_id,
          bpm,
          key,
          version
        ),
        releases:releases!release_tracks_release_id_fkey (
          id,
          cover_path,
          title,
          status
        )
      `)
      .in("track_id", topTrackIds)
      .eq("releases.status", "published");

    topTracksDetails = rows ?? [];
  }

  const topTracksDetailsById: Record<string, any> = {};
  for (const row of topTracksDetails) {
    if (row?.track_id) topTracksDetailsById[row.track_id] = row;
  }

  const topTracks = topTracksRawApi.map((a) => {
    const trackId = a.track_id;

    const d = topTracksDetailsById[a.track_id] ?? null;
    const trackData = d?.tracks;

    const ownerId = String((trackData as any)?.artist_id ?? id ?? "");
    const ownerName = String(profile.display_name ?? "Unknown Artist");

    const collabs = (topTrackArtistsMap?.[trackId] ?? []).map((x) => ({
      id: String(x.id),
      display_name: String(x.display_name ?? "Unknown Artist"),
    }));

    const merged: { id: string; display_name: string }[] = [];
    if (ownerId) merged.push({ id: ownerId, display_name: ownerName });

    for (const c of collabs) {
      if (!c?.id) continue;
      if (!merged.some((m) => m.id === c.id)) merged.push(c);
    }

    topTrackArtistsMergedMap[trackId] = merged;
    
    if (!trackData) {
      // Fallback wenn keine Track-Daten gefunden wurden
      return {
        track_id: a.track_id,
        streams: a.streams ?? 0,
        unique_listeners: a.unique_listeners ?? 0,
        track_title: d?.track_title ?? null,
        cover_path: d?.releases?.cover_path ?? null,
        rating_avg: d?.rating_avg ?? null,
        rating_count: d?.rating_count ?? 0,
        release_id: d?.releases?.id ?? null,
        playerTrack: null as any,
      };
    }

    // Erstelle PlayerTrack-Objekt mit toPlayerTrack
    const cover_url =
      d?.releases?.cover_path
        ? supabase.storage
            .from("release_covers")
            .getPublicUrl(d.releases.cover_path).data.publicUrl ?? null
        : null;

    const audio_url =
      trackData?.audio_path
        ? supabase.storage
            .from("tracks")
            .getPublicUrl(trackData.audio_path).data.publicUrl
        : null;

    if (!audio_url) {
      if (__DEV__) {
        console.error("ArtistPage: missing audio_url, skipping track", {
          track_id: trackData.id,
          audio_path: trackData.audio_path ?? null,
        });
      }
      return null;
    }

    const playerTrack = toPlayerTrack({
      id: trackData.id,
      title: trackData.title ?? d?.track_title ?? null,
      artist_id: trackData.artist_id ?? id,
      audio_url,
      cover_url,
      bpm: trackData.bpm ?? null,
      key: trackData.key ?? null,
      version: trackData.version ?? null,
    });
    
    // Füge optionale Felder hinzu
    if (d?.rating_avg !== null && d?.rating_avg !== undefined) {
      playerTrack.rating_avg = d.rating_avg;
    }
    if (d?.rating_count !== null && d?.rating_count !== undefined) {
      playerTrack.rating_count = d.rating_count;
    }
    if (d?.releases?.id) {
      playerTrack.release_id = d.releases.id;
    }

    return {
      track_id: a.track_id,
      streams: a.streams ?? 0,
      unique_listeners: a.unique_listeners ?? 0,
      track_title: d?.track_title ?? null,
      cover_path: d?.releases?.cover_path ?? null,
      rating_avg: a.rating_avg ?? d?.rating_avg ?? null,
      rating_count: a.ratings_count ?? d?.rating_count ?? 0,
      release_id: d?.releases?.id ?? null,
      playerTrack,
    };
  })
    .filter(Boolean) as Array<{
      track_id: string;
      streams: number;
      unique_listeners: number;
      track_title: string | null;
      cover_path: string | null;
      rating_avg: number | null;
      rating_count: number;
      release_id: string | null;
      playerTrack: any;
    }>;

  const tracksByRelease: Record<string, any[]> = {};
  (releaseTracks ?? []).forEach((rt) => {
    if (!tracksByRelease[rt.release_id]) tracksByRelease[rt.release_id] = [];
    tracksByRelease[rt.release_id].push(rt);
  });

  const canSaveArtist = !!user?.id && user.id !== id;

  let initialSaved = false;
  if (canSaveArtist) {
    const { data: savedRow, error } = await supabase
      .from("library_artists")
      .select("artist_id")
      .eq("user_id", user!.id)
      .eq("artist_id", id)
      .maybeSingle();

    if (error) {
      console.error("Failed to read library_artists:", error);
    } else {
      initialSaved = !!savedRow;
    }
  }

  // NOTE: Do NOT use Date.now() in src (causes constant reloads). Cache-busting belongs in upload flow.
  const bannerUrl = profile.banner_url || null;
  const avatarUrlBase = profile.avatar_url || null;
  const avatarUrl =
    avatarUrlBase && profile.updated_at
      ? `${avatarUrlBase}${avatarUrlBase.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(profile.updated_at))}`
      : avatarUrlBase;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="relative w-full">
        {/* Full-width bloom background (mobile fill) */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            bg-[#0E0E10]
          "
        />
        <div
          className="
            pointer-events-none
            absolute inset-0
            opacity-80
            blur-[60px]
            bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,198,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(0,255,198,0.10),transparent_55%)]
          "
        />

        {/* Keep content constrained */}
        <div className="w-full pt-6">
          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Artist Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/[0.06] to-white/5" />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

            <div className="absolute left-4 right-4 bottom-4 md:left-8 md:right-8 md:top-1/2 md:bottom-auto md:-translate-y-1/2 flex items-start md:items-center gap-4 md:gap-6">
              <div className="shrink-0 hidden md:block">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.display_name}
                    className="w-36 h-36 rounded-full object-cover border-4 border-white/15 shadow-2xl"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-full bg-white/10 border-4 border-white/10" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-xl truncate">
                  {profile.display_name}
                </h1>

                {profile.location ? (
                  <p className="mt-1 text-sm md:text-base text-white/70 drop-shadow-md">
                    {profile.location}
                  </p>
                ) : null}

                <div className="mt-2 md:mt-3">
                  <FollowCountsClient
                    profileId={id}
                    followerCount={followerCountNum}
                    followingCount={followingCountNum}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Social (inline) + Bio */}
      <div className="w-full max-w-[1600px] px-0 mt-6">
        <div className="flex flex-wrap items-center gap-5">
          {canSaveArtist ? (
            <SaveArtistButton artistId={id} initialSaved={initialSaved} />
          ) : null}

          <FollowArtistButton artistId={id} />

          <div className="flex items-center gap-4">
            {profile.instagram ? (
              <a
                href={profile.instagram}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Instagram"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Instagram size={16} />
                Instagram
              </a>
            ) : null}

            {profile.tiktok ? (
              <a
                href={profile.tiktok}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="TikTok"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Music2 size={16} />
                TikTok
              </a>
            ) : null}

            {profile.facebook ? (
              <a
                href={profile.facebook}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Facebook"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Facebook size={16} />
                Facebook
              </a>
            ) : null}

            {profile.x ? (
              <a
                href={profile.x}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="X"
                className="flex items-center gap-1 text-[#B3B3B3] hover:text-[#00FFC6] transition-colors text-sm"
              >
                <Twitter size={16} />
                X
              </a>
            ) : null}
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-6 max-w-3xl text-white/90 whitespace-pre-line leading-relaxed">
            {profile.bio}
          </p>
        ) : null}
      </div>

      {/* Releases */}
      <div className="w-full max-w-[1600px] px-0 mt-10 pb-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-white">Releases</h2>
          <div className="text-sm text-[#B3B3B3]">
            {(releases?.length ?? 0) > 0 ? `${releases!.length} published` : ""}
          </div>
        </div>

        {releases && releases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-4">
            {releases.map((rel) => {
              const coverUrl = rel.cover_path
                ? supabase.storage
                    .from("release_covers")
                    .getPublicUrl(rel.cover_path).data.publicUrl
                : null;

              const cardData: ReleaseCardData = {
                id: rel.id,
                title: rel.title,
                cover_url: coverUrl,
                release_type: rel.release_type ?? null,
                artist_id: id,
                artist_name: profile.display_name ?? "Unknown Artist",
              };

              return (
                <ReleaseCard
                  key={rel.id}
                  releaseId={rel.id}
                  data={cardData}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-400 text-sm">No releases yet.</p>
          </div>
        )}

        {/* Public Playlists */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-white">Playlists</h2>
            <div className="text-sm text-[#B3B3B3]">
              {(publicPlaylists?.length ?? 0) > 0 ? `${publicPlaylists!.length} public` : ""}
            </div>
          </div>

          {publicPlaylists && publicPlaylists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-4">
              {publicPlaylists.map((pl) => {
                const coverUrl = pl.cover_url
                  ? supabase.storage
                      .from("playlist-covers")
                      .getPublicUrl(pl.cover_url).data.publicUrl
                  : null;

                return (
                  <PlaylistCard
                    key={pl.id}
                    id={pl.id}
                    title={pl.title}
                    description={null}
                    cover_url={coverUrl}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-neutral-400 text-sm">No public playlists yet.</p>
            </div>
          )}
        </div>

        {/* Top Tracks */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-white">Top Tracks</h2>
            <div className="text-sm text-[#B3B3B3]">
              {(topTracks?.length ?? 0) > 0 ? "Last 30 days" : ""}
            </div>
          </div>

          {topTracks && topTracks.length > 0 ? (
            <div className="flex flex-col w-full">
              {topTracks.map((t, idx) => {
                const coverUrl = t.cover_path
                  ? supabase.storage
                      .from("release_covers")
                      .getPublicUrl(t.cover_path).data.publicUrl
                  : null;

                if (!t.playerTrack) {
                  // Skip tracks without playerTrack data
                  return null;
                }

                const playerTracksQueue = topTracks
                  .filter((tt) => tt.playerTrack)
                  .map((tt) => tt.playerTrack);
                
                const queueIndex = playerTracksQueue.findIndex((pt) => pt.id === t.track_id);

                return (
                  <TrackRowBase
                    key={t.track_id}
                    track={t.playerTrack}
                    index={queueIndex}
                    tracks={playerTracksQueue}
                    coverUrl={coverUrl}
                    leadingSlot={
                      <span className="text-white/50 text-sm tabular-nums">
                        {idx + 1}
                      </span>
                    }
                    subtitleSlot={
                      <div key={`toptrack-artists-${t.track_id}`}>
                        <LibraryTrackArtists
                          artists={topTrackArtistsMergedMap?.[t.track_id] ?? null}
                          fallbackArtistId={(t.playerTrack as any)?.artist_id ?? null}
                          fallbackDisplayName={profile.display_name ?? "Unknown Artist"}
                        />
                      </div>
                    }
                    metaSlot={
                      <div key={`meta-${t.track_id}`} className="flex items-center gap-4">
                        {/* Rating column (fixed width) */}
                        <div className="w-[140px]">
                        {t.rating_avg !== null && t.rating_count > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-[2px] leading-none">
                              {[1, 2, 3, 4, 5].map((i) => {
                                const filled = i <= Math.round(Number(t.rating_avg));
                                return (
                                  <span
                                    key={`star-${t.track_id}-${i}`}
                                    className={filled ? "text-[#00FFC6] text-sm" : "text-white/25 text-sm"}
                                    aria-hidden="true"
                                  >
                                    ★
                                  </span>
                                );
                              })}
                            </div>
                            <div className="text-xs text-white/50 tabular-nums">
                              {Number(t.rating_avg).toFixed(1)} ({t.rating_count})
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-white/40">No ratings yet</div>
                        )}
                        </div>

                        {/* Streams */}
                        <div className="text-xs text-white/50 tabular-nums whitespace-nowrap">
                          {(t.streams ?? 0).toLocaleString()} streams
                        </div>
                      </div>
                    }
                    actionsSlot={
                      <TrackOptionsTrigger
                        track={t.playerTrack}
                        showGoToArtist={false}
                        showGoToRelease={true}
                        releaseId={t.release_id}
                      />
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-neutral-400 text-sm">No top tracks yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
