import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Instagram, Facebook, Twitter, Music2 } from "lucide-react";
import BackLink from "@/components/BackLink";
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
  ]);

  type TopTracksRow = {
    track_id: string;
    streams: number | null;
    unique_listeners: number | null;
    listened_seconds: number | null;
    ratings_count: number | null;
    rating_avg: number | null;
  };

  let topTracksRawApi: TopTracksRow[] = [];

  {
    const { data, error } = await supabase
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
      .eq("artist_id", id)
      .order("streams_30d", { ascending: false })
      .limit(10);

    if (!error && Array.isArray(data)) {
      topTracksRawApi = data as TopTracksRow[];
    } else {
      if (__DEV__) {
        console.error("ArtistPage: failed to load top tracks from analytics view", {
          artist_id: id,
          error_message: error?.message ?? null,
          error_code: (error as any)?.code ?? null,
          error_details: (error as any)?.details ?? null,
          error_hint: (error as any)?.hint ?? null,
        });
      }
      topTracksRawApi = [];
    }
  }

  const topTrackIds = topTracksRawApi.map((r) => r.track_id);

  // TopTracks: resolved details (track + release + owner + collaborators) in ONE query
  type TopTrackResolvedRow = {
    track_id: string;
    release_id: string;
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
    } else {
      if (__DEV__) {
        console.error("ArtistPage: failed to load top tracks resolved view", {
          artist_id: id,
          error_message: error?.message ?? null,
          error_code: (error as any)?.code ?? null,
          error_details: (error as any)?.details ?? null,
          error_hint: (error as any)?.hint ?? null,
        });
      }
      topTracksResolved = [];
    }
  }

  const topTracksDetailsById: Record<string, TopTrackResolvedRow> = {};
  for (const row of topTracksResolved) {
    if (row?.track_id) topTracksDetailsById[row.track_id] = row;
  }

  // Merge owner into artists list so we always show: owner, collabs...
  const topTrackArtistsMergedMap: Record<string, { id: string; display_name: string }[]> = {};

  const topTracks = topTracksRawApi
    .map((a) => {
      const trackId = a.track_id;

      const d = topTracksDetailsById[trackId] ?? null;

      // Build artists list: owner first, then collaborators (already resolved in view)
      const merged: { id: string; display_name: string }[] = [];

      const ownerId = String(d?.owner_id ?? id ?? "");
      const ownerName = String(d?.owner_name ?? profile.display_name ?? "Unknown Artist");

      if (ownerId) merged.push({ id: ownerId, display_name: ownerName });

      const collabArr = Array.isArray(d?.collaborators) ? d!.collaborators : [];

      for (const c of collabArr) {
        const cid = String(c?.artist_id ?? "");
        const cname = String(c?.display_name ?? "Unknown Artist");
        if (!cid) continue;
        if (!merged.some((m) => m.id === cid)) merged.push({ id: cid, display_name: cname });
      }

      topTrackArtistsMergedMap[trackId] = merged;

      // Fallback wenn resolved Row fehlt (sollte selten sein)
      if (!d) {
        return {
          track_id: a.track_id,
          streams: a.streams ?? 0,
          unique_listeners: a.unique_listeners ?? 0,
          track_title: null,
          cover_path: null,
          rating_avg: a.rating_avg ?? null,
          rating_count: a.ratings_count ?? 0,
          release_id: null,
          playerTrack: null as any,
        };
      }

      const cover_url =
        d.cover_path
          ? supabase.storage.from("release_covers").getPublicUrl(d.cover_path).data.publicUrl ?? null
          : null;

      const audio_url =
        d.audio_path ? supabase.storage.from("tracks").getPublicUrl(d.audio_path).data.publicUrl : null;

      if (!audio_url) {
        if (__DEV__) {
          console.error("ArtistPage: missing audio_url, skipping track", {
            track_id: d.track_id,
            audio_path: d.audio_path ?? null,
          });
        }
        return null;
      }

      const playerTrack = toPlayerTrack({
        id: d.track_id,
        title: d.track_title ?? null,
        artist_id: ownerId || id,
        audio_url,
        cover_url,
        bpm: d.bpm ?? null,
        key: d.key ?? null,
        version: d.track_version ?? null,
      });

      // Optionale Felder
      if (a.rating_avg !== null && a.rating_avg !== undefined) {
        playerTrack.rating_avg = a.rating_avg;
      }
      if (a.ratings_count !== null && a.ratings_count !== undefined) {
        playerTrack.rating_count = a.ratings_count;
      }
      if (d.release_id) {
        playerTrack.release_id = d.release_id;
      }

      return {
        track_id: a.track_id,
        streams: a.streams ?? 0,
        unique_listeners: a.unique_listeners ?? 0,
        track_title: d.track_title ?? null,
        cover_path: d.cover_path ?? null,
        rating_avg: a.rating_avg ?? null,
        rating_count: a.ratings_count ?? 0,
        release_id: d.release_id ?? null,
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

  const canFollowArtist = !!user?.id && user.id !== id;

  let initialIsFollowing = false;
  if (canFollowArtist) {
    const { data: followRow, error: followError } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", id)
      .maybeSingle();

    if (followError) {
      if (__DEV__) {
        console.error("Failed to read follows:", followError);
      }
      initialIsFollowing = false;
    } else {
      initialIsFollowing = !!followRow;
    }
  }

  // NOTE: Do NOT use Date.now() in src (causes constant reloads). Cache-busting belongs in upload flow.
  const bannerUrl = profile.banner_url || null;
  const avatarUrlBase = profile.avatar_url || null;
  const avatarUrl =
    avatarUrlBase && profile.updated_at
      ? `${avatarUrlBase}${avatarUrlBase.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(profile.updated_at))}`
      : avatarUrlBase;

  const playerTracksQueue = topTracks
    .filter((tt) => tt.playerTrack)
    .map((tt) => tt.playerTrack);

  const playerTracksQueueIndexByTrackId = new Map<string, number>();
  playerTracksQueue.forEach((pt, idx) => {
    playerTracksQueueIndexByTrackId.set(pt.id, idx);
  });

  return (
    <div className="w-full">
      {/* Header (full-bleed banner) */}
      <div className="relative left-1/2 right-1/2 -translate-x-1/2 w-screen">
        {/* Full-width bloom background */}
        <div className="pointer-events-none absolute inset-0 bg-[#0E0E10]" />
        <div
          className="
            pointer-events-none
            absolute inset-0
            opacity-80
            blur-[60px]
            bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,198,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(0,255,198,0.10),transparent_55%)]
          "
        />

        {/* Banner: full-bleed, no card */}
        <div className="relative w-full overflow-hidden aspect-[16/9] min-h-[260px] max-h-[520px]">
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

          {/* Back button inside banner */}
          <div className="absolute left-4 top-6 md:left-40 z-50 pointer-events-auto group">
            <div
              className="
                inline-flex items-center rounded-full
                bg-black/55 backdrop-blur-md
                border border-white/15
                px-3 py-1.5
                shadow-lg
                transition-all duration-200
                hover:border-[#00FFC6]/60
                hover:shadow-[0_0_18px_rgba(0,255,198,0.35)]
                active:shadow-[0_0_26px_rgba(0,255,198,0.55)]
              "
            >
              <BackLink
                label="Back"
                className="
                  mb-0
                  text-white/90
                  transition-all
                  group-hover:text-[#00FFC6]
                  group-hover:drop-shadow-[0_0_10px_rgba(0,255,198,0.6)]
                  active:drop-shadow-[0_0_14px_rgba(0,255,198,0.8)]
                "
              />
            </div>
          </div>

          {/* Banner content */}
          <div className="absolute left-4 right-6 bottom-4 md:left-40 md:right-16 md:top-1/2 md:bottom-auto md:-translate-y-1/2 flex items-start md:items-center gap-4 md:gap-6">
            <div className="shrink-0 hidden md:block">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.display_name}
                  className="w-44 h-44 md:w-48 md:h-48 rounded-full object-cover border-4 border-white/15 shadow-2xl"
                />
              ) : (
                <div className="w-44 h-44 md:w-48 md:h-48 rounded-full bg-white/10 border-4 border-white/10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-xl truncate leading-tight">
                {profile.display_name}
              </h1>

              {profile.location ? (
                <p className="mt-1 text-base md:text-lg text-white/70 drop-shadow-md">
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

      {/* Actions + Social (inline) + Bio */}
      <div className="w-full max-w-[1600px] px-0 mt-6">
        <div className="flex flex-wrap items-center gap-5">
          {canSaveArtist ? (
            <SaveArtistButton artistId={id} initialSaved={initialSaved} />
          ) : null}

          <FollowArtistButton artistId={id} initialIsFollowing={initialIsFollowing} />

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

                const queueIndex = playerTracksQueueIndexByTrackId.get(t.track_id) ?? -1;

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
