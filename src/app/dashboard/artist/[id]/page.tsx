import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Instagram, Facebook, Twitter, Music2 } from "lucide-react";
import ClientTrackRows from "./ClientTrackRows";
import ReleasePlayButton from "./ReleasePlayButton";
import SaveArtistButton from "./SaveArtistButton";
import FollowArtistButton from "./FollowArtistButton";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import { toPlayerTrack } from "@/lib/playerTrack";
import PlaylistPlayOverlayButton from "./PlaylistPlayOverlayButton";

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

  const { data: releases } = await supabase
    .from("releases")
    .select("id, title, cover_path, release_type, status, created_at")
    .eq("artist_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const { data: publicPlaylists } = await supabase
    .from("playlists")
    .select("id, title, cover_url, created_at")
    .eq("created_by", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const { data: topTracksRaw } = await supabase
    .from("analytics_artist_top_tracks_30d")
    .select("track_id, streams, unique_listeners")
    .eq("artist_id", id)
    .order("streams", { ascending: false })
    .limit(10);

  const topTrackIds = (topTracksRaw ?? []).map((r) => r.track_id);

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
          key
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

  const topTracks = (topTracksRaw ?? []).map((a) => {
    const d = topTracksDetails.find((x) => x.track_id === a.track_id) || null;
    const trackData = d?.tracks;
    
    if (!trackData) {
      // Fallback wenn keine Track-Daten gefunden wurden
      return {
        track_id: a.track_id,
        streams: a.streams ?? 0,
        track_title: d?.track_title ?? null,
        cover_path: d?.releases?.cover_path ?? null,
        rating_avg: d?.rating_avg ?? null,
        rating_count: d?.rating_count ?? 0,
        release_id: d?.releases?.id ?? null,
        playerTrack: null as any,
      };
    }

    // Erstelle PlayerTrack-Objekt mit toPlayerTrack
    const playerTrack = toPlayerTrack({
      id: trackData.id,
      title: trackData.title ?? d?.track_title ?? null,
      artist_id: trackData.artist_id ?? id,
      audio_path: trackData.audio_path ?? null,
      bpm: trackData.bpm ?? null,
      key: trackData.key ?? null,
      releases: d?.releases ? {
        id: d.releases.id,
        cover_path: d.releases.cover_path ?? null,
        status: d.releases.status ?? null,
      } : null,
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
      track_title: d?.track_title ?? null,
      cover_path: d?.releases?.cover_path ?? null,
      rating_avg: d?.rating_avg ?? null,
      rating_count: d?.rating_count ?? 0,
      release_id: d?.releases?.id ?? null,
      playerTrack,
    };
  });

  const { data: releaseTracks } = await supabase
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
          artist_id
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
    .eq("releases.status", "published");

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
  const avatarUrl = profile.avatar_url || null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="w-full max-w-[1200px] mx-auto px-6 pt-6">
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

          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 flex items-center gap-6">
            <div className="shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile.display_name}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-white/15 shadow-2xl"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/10 border-4 border-white/10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-xl truncate">
                {profile.display_name}
              </h1>

              {profile.location ? (
                <p className="mt-2 text-sm md:text-base text-white/70 drop-shadow-md">
                  {profile.location}
                </p>
              ) : null}

              <div className="mt-3 flex items-center gap-6 text-sm text-white/70">
                <span>
                  <span className="text-white/90 font-semibold tabular-nums">
                    {followerCount ?? 0}
                  </span>{" "}
                  Followers
                </span>
                <span>
                  <span className="text-white/90 font-semibold tabular-nums">
                    {followingCount ?? 0}
                  </span>{" "}
                  Following
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions + Social (inline) + Bio */}
      <div className="w-full max-w-[1200px] mx-auto px-6 mt-6">
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
      <div className="w-full max-w-[1200px] mx-auto px-6 mt-10 pb-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold text-white">Releases</h2>
          <div className="text-sm text-[#B3B3B3]">
            {(releases?.length ?? 0) > 0 ? `${releases!.length} published` : ""}
          </div>
        </div>

        {releases && releases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {releases.map((rel) => {
              const coverUrl = rel.cover_path
                ? supabase.storage
                    .from("release_covers")
                    .getPublicUrl(rel.cover_path).data.publicUrl
                : null;

              const relTracks = tracksByRelease[rel.id] || [];

              return (
                <div
                  key={rel.id}
                  className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors border border-white/10 hover:border-white/20 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md"
                >
                  <div className="relative">
                    <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <Link href={`/dashboard/release/${rel.id}`} className="block">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={rel.title}
                            className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-neutral-800" />
                        )}
                      </Link>

                      {/* Play Overlay – exakt bounded to cover */}
                      <div
                        className="
                          absolute inset-0 flex items-center justify-center
                          opacity-0 group-hover:opacity-100
                          transition-all duration-300
                        "
                      >
                        <ReleasePlayButton tracks={relTracks} />
                      </div>
                    </div>

                    <Link href={`/dashboard/release/${rel.id}`} className="block">
                      <div className="min-w-0 mt-4">
                        <h3 className="text-base font-semibold text-white truncate">
                          {rel.title}
                        </h3>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-white/50">
                          {rel.release_type}
                        </p>
                      </div>
                    </Link>
                  </div>

                  <div className="h-px bg-white/10 my-1" />

                  <ClientTrackRows releaseId={rel.id} tracks={relTracks} />
                </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {publicPlaylists.map((pl) => {
                const coverUrl = pl.cover_url
                  ? supabase.storage
                      .from("playlist-covers")
                      .getPublicUrl(pl.cover_url).data.publicUrl
                  : null;

                return (
                  <div
                    key={pl.id}
                    className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors border border-white/10 hover:border-white/20 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md"
                  >
                    <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <Link href={`/dashboard/playlist/${pl.id}`} className="block">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={pl.title}
                            className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-neutral-800" />
                        )}
                      </Link>
                      <PlaylistPlayOverlayButton playlistId={pl.id} size="lg" />
                    </div>

                    <Link href={`/dashboard/playlist/${pl.id}`} className="block">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">
                          {pl.title}
                        </h3>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-white/50">
                          Public playlist
                        </p>
                      </div>
                    </Link>
                  </div>
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
            <div className="flex flex-col gap-3">
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
                  <div
                    key={t.track_id}
                    className="
                      flex items-center gap-4
                      px-5 py-4
                      rounded-2xl
                      border border-white/10
                      bg-white/[0.03]
                      hover:bg-white/[0.05]
                      hover:border-white/20
                      transition
                    "
                  >
                    {/* Index */}
                    <div className="w-6 text-sm text-white/50 tabular-nums">
                      {idx + 1}
                    </div>

                    {/* Cover */}
                    <div className="relative group w-14 h-14 -my-1 rounded-xl overflow-hidden border border-white/10 bg-black/20 shrink-0">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={t.track_title ?? "Track cover"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-800" />
                      )}
                      <PlayOverlayButton
                        track={t.playerTrack}
                        index={queueIndex >= 0 ? queueIndex : undefined}
                        tracks={playerTracksQueue}
                      />
                    </div>

                    {/* Title */}
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">
                        {t.track_title ?? "Unknown track"}
                      </div>
                      {t.rating_avg !== null && t.rating_count > 0 ? (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-[2px] leading-none">
                            {[1, 2, 3, 4, 5].map((i) => {
                              const filled = i <= Math.round(Number(t.rating_avg));
                              return (
                                <span
                                  key={i}
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
                        <div className="text-xs text-white/40 mt-1">No ratings yet</div>
                      )}
                    </div>

                    {/* Streams */}
                    <div className="text-sm text-white/70 tabular-nums">
                      {t.streams} streams
                    </div>

                    {/* Options Menu */}
                    <div className="shrink-0">
                      <TrackOptionsTrigger
                        track={t.playerTrack}
                        showGoToArtist={false}
                        showGoToRelease={true}
                        releaseId={t.release_id}
                      />
                    </div>
                  </div>
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
