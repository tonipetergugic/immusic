import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import ReleaseDetailClient from "./ReleaseDetailClient";
import type { PlayerTrack } from "@/types/playerTrack";
import { formatReleaseDate, formatTotalDuration } from "./_lib/format";
import { buildArtistsList, type ResolvedArtistRow } from "./_lib/artists";

type ReleaseTrackRelation = {
  id: string;
  title: string | null;
  lyrics: string | null;
  audio_path: string | null;
  duration: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  version: string | null;
  status: string | null;
  is_explicit: boolean;
  artist_id: string | null;
  artist:
    | { id: string; display_name: string | null }
    | { id: string; display_name: string | null }[]
    | null;
};

type ReleaseTrackItem = {
  id: string;
  position: number | null;
  track: ReleaseTrackRelation | ReleaseTrackRelation[] | null;
};

type MyTrackRatingRow = {
  track_id: string | null;
  stars: number | null;
  created_at: string | null;
};

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id: releaseId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canSaveRelease = !!user?.id;

  let initialSaved = false;
  if (canSaveRelease) {
    const { data: savedRow, error: savedErr } = await supabase
      .from("library_releases")
      .select("release_id")
      .eq("user_id", user.id)
      .eq("release_id", releaseId)
      .maybeSingle();

    if (savedErr) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to read library_releases:", savedErr);
      }
      initialSaved = false;
    } else {
      initialSaved = !!savedRow;
    }
  }

  // Release + Artist (profiles)
  const { data: release, error } = await supabase
    .from("releases")
    .select(
      `
      id,
      title,
      cover_path,
      artist_id,
      release_date,
      release_type,
      profiles:artist_id ( display_name )
    `
    )
    .eq("id", releaseId)
    .single();

  if (error || !release) {
    return (
      <div className="text-white">
        <div className="mb-3">
          <BackLink />
        </div>
        <h1 className="text-xl font-semibold">Release not found</h1>
      </div>
    );
  }

  const coverUrl = release.cover_path
    ? supabase.storage
        .from("release_covers")
        .getPublicUrl(release.cover_path).data.publicUrl
    : null;

  // Tracklist: release_tracks -> tracks
  const { data: items, error: itemsError } = await supabase
    .from("release_tracks")
    .select(
      `
      id,
      position,
      track:tracks (
        id,
        title,
        lyrics,
        audio_path,
        duration,
        rating_avg,
        rating_count,
        bpm,
        key,
        genre,
        version,
        status,
        is_explicit,
        artist_id,
        artist:profiles!tracks_artist_id_fkey (
          id,
          display_name
        )
      )
    `
    )
    .eq("release_id", releaseId)
    .order("position", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const typedItems = (items ?? []) as ReleaseTrackItem[];
  function getTrack(row: ReleaseTrackItem): ReleaseTrackRelation | null {
    return Array.isArray(row.track) ? row.track[0] ?? null : row.track;
  }
  function hasValidTrack(
    row: ReleaseTrackItem
  ): row is ReleaseTrackItem & {
    track: ReleaseTrackRelation | ReleaseTrackRelation[];
  } {
    const track = getTrack(row);
    return !!track?.id;
  }

  const validItems = typedItems.filter(hasValidTrack);

  const trackIds = validItems
    .map((row) => getTrack(row)?.id)
    .filter((value): value is string => typeof value === "string");

  let trackArtistsResolvedRows: {
    track_id: string | null;
    artists: ResolvedArtistRow[] | null;
  }[] = [];

  if (trackIds.length > 0) {
    const { data: resolvedArtistsData, error: resolvedArtistsError } =
      await supabase
        .from("track_artists_resolved")
        .select("track_id, artists")
        .in("track_id", trackIds);

    if (resolvedArtistsError) {
      throw resolvedArtistsError;
    }

    trackArtistsResolvedRows = resolvedArtistsData ?? [];
  }

  const trackArtistsByTrackId = new Map<string, ResolvedArtistRow[]>();

  for (const row of trackArtistsResolvedRows) {
    const trackId = String(row.track_id ?? "");
    if (!trackId) continue;

    trackArtistsByTrackId.set(
      trackId,
      Array.isArray(row.artists) ? row.artists : []
    );
  }

  let lifetimeRows: { track_id: string; streams_lifetime: number | null }[] = [];

  if (trackIds.length > 0) {
    const { data: analyticsLifetimeRows, error: analyticsLifetimeError } =
      await supabase
        .from("analytics_track_lifetime")
        .select("track_id, streams_lifetime")
        .in("track_id", trackIds);

    if (analyticsLifetimeError) {
      throw analyticsLifetimeError;
    }

    lifetimeRows = analyticsLifetimeRows ?? [];
  }

  const lifetimeStreamsByTrackId = new Map(
    lifetimeRows.map((row) => [
      row.track_id,
      typeof row.streams_lifetime === "number" ? row.streams_lifetime : 0,
    ])
  );

  const myStarsByTrackId = new Map<string, number | null>();

  if (user?.id && trackIds.length > 0) {
    const { data: myRatingRows, error: myRatingsError } = await supabase
      .from("track_ratings")
      .select("track_id, stars, created_at")
      .eq("user_id", user.id)
      .in("track_id", trackIds)
      .order("created_at", { ascending: false });

    if (myRatingsError) {
      throw myRatingsError;
    }

    for (const row of (myRatingRows ?? []) as MyTrackRatingRow[]) {
      const trackId = String(row.track_id ?? "");
      if (!trackId) continue;

      if (!myStarsByTrackId.has(trackId)) {
        myStarsByTrackId.set(trackId, row.stars ?? null);
      }
    }
  }

  const releaseProfile = Array.isArray(release.profiles)
    ? release.profiles[0] ?? null
    : release.profiles;

  const artistName = releaseProfile?.display_name ?? "Unknown Artist";

  const trackCount = validItems.length;
  const totalSeconds = validItems.reduce(
    (sum, row) => sum + (getTrack(row)?.duration ?? 0),
    0
  );
  const formattedReleaseDate = formatReleaseDate(release.release_date);
  const formattedDuration = formatTotalDuration(totalSeconds);

  // Build Player queue SERVER-side (no client fetch)
  const playerQueue = validItems.reduce<PlayerTrack[]>((acc, row) => {
    const t = getTrack(row);
    if (!t?.id || !t.audio_path) return acc;

    const { data: audioPublic } = supabase.storage
      .from("tracks")
      .getPublicUrl(t.audio_path);

    const audio_url = audioPublic?.publicUrl ?? null;
    if (!audio_url) return acc;

    const artistProfile = Array.isArray(t.artist) ? t.artist[0] : t.artist;

    acc.push({
      id: String(t.id),
      title: String(t.title ?? "Untitled"),
      artist_id: String(t.artist_id ?? ""),
      status: t.status ?? null,
      is_explicit: t.is_explicit ?? false,
      audio_url,
      cover_url: coverUrl ?? null,
      bpm: t.bpm ?? null,
      key: t.key ?? null,
      profiles: artistProfile?.display_name
        ? { display_name: String(artistProfile.display_name) }
        : undefined,
      release_id: String(releaseId),
    });

    return acc;
  }, []);

  const releaseTracks = validItems.map((row) => {
    const t = getTrack(row);

    return {
      releaseTrackId: String(row.id),
      trackId: String(t?.id ?? ""),
      positionLabel: String(row.position ?? ""),
      title: t?.title ?? null,
      lyrics: t?.lyrics ?? null,
      bpm: t?.bpm ?? null,
      key: t?.key ?? null,
      genre: t?.genre ?? null,
      version: t?.version ?? null,
      status: t?.status ?? null,
      is_explicit: t?.is_explicit ?? false,
      ratingAvg: t?.rating_avg ?? null,
      ratingCount: t?.rating_count ?? null,
      streamCount: lifetimeStreamsByTrackId.get(String(t?.id ?? "")) ?? 0,
      myStars: myStarsByTrackId.get(String(t?.id ?? "")) ?? null,
      artists: buildArtistsList({
        primaryArtist: Array.isArray(t?.artist) ? t.artist[0] ?? null : t?.artist ?? null,
        resolvedArtists: trackArtistsByTrackId.get(String(t?.id ?? "")) ?? [],
      }),
    };
  });

  return (
    <div className="text-white">
      {/* HERO (wie Track) */}
      <div className="relative overflow-hidden -mx-3 sm:-mx-4 lg:-mx-8 rounded-none">
        {/* BACKGROUND BLOOM */}
        <div
          className="
            absolute inset-0 bg-cover bg-center
            blur-[50px] opacity-80 brightness-125 saturate-125
            pointer-events-none
          "
          style={{
            backgroundImage: coverUrl ? `url('${coverUrl}')` : undefined,
          }}
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)] pointer-events-none" />

        {/* SOFT FADE (nach unten auslaufend) */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-b
            from-[rgba(0,0,0,0.00)]
            via-[rgba(0,0,0,0.25)]
            via-[rgba(0,0,0,0.45)]
            to-[rgba(14,14,16,0.95)]
            pointer-events-none
          "
        />

        {/* CONTENT */}
        <div className="relative px-4 sm:px-6 md:px-8 pt-5 sm:pt-6 md:pt-8 pb-8 sm:pb-10 md:pb-12">
          <div className="mb-6">
            <BackLink />
          </div>

          <div className="flex flex-col items-center text-center gap-5 sm:gap-6 lg:flex-row lg:items-end lg:text-left lg:gap-8">
            {/* Cover */}
            <div className="shrink-0 relative group mx-auto lg:mx-0">
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt={release.title}
                  width={320}
                  height={320}
                  priority
                  className="rounded-xl shadow-2xl object-cover w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] lg:w-[280px] lg:h-[280px]"
                />
              ) : (
                <div className="rounded-xl bg-neutral-800 w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] lg:w-[280px] lg:h-[280px] shadow-2xl" />
              )}
              {playerQueue.length > 0 && (
                <PlayOverlayButton
                  size="lg"
                  track={playerQueue[0]}
                  tracks={playerQueue}
                  index={0}
                />
              )}
            </div>

            {/* Title / Meta */}
            <div className="w-full min-w-0 lg:flex-1">
              <div className="mb-2 text-sm sm:text-base lg:text-sm text-white/70 font-medium">
                {release.release_type ? (
                  <span className="capitalize">{release.release_type}</span>
                ) : (
                  "Release"
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-white leading-[0.95] break-words">
                {release.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[15px] sm:text-base lg:justify-start lg:text-sm text-white/75">
                  {release.artist_id ? (
                    <Link
                      href={`/dashboard/artist/${release.artist_id}`}
                      className="text-white font-semibold text-base md:text-lg hover:text-[#00FFC6] transition-colors cursor-pointer"
                    >
                      {artistName}
                    </Link>
                  ) : (
                    <span className="text-white font-semibold text-base md:text-lg">
                      {artistName}
                    </span>
                  )}

                  {formattedReleaseDate ? (
                    <>
                      <span className="text-white/40">•</span>
                      <span>Released {formattedReleaseDate}</span>
                    </>
                  ) : null}

                  <>
                    <span className="text-white/40">•</span>
                    <span>
                      {trackCount} {trackCount === 1 ? "track" : "tracks"}
                      {formattedDuration ? ` • ${formattedDuration}` : ""}
                    </span>
                  </>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReleaseDetailClient
        releaseId={releaseId}
        releaseCoverUrl={coverUrl}
        playerQueue={playerQueue}
        tracks={releaseTracks}
        canSaveRelease={canSaveRelease}
        currentUserId={user?.id ?? null}
        initialSaved={initialSaved}
      />
    </div>
  );
}

