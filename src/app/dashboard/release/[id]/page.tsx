import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import ReleaseDetailClient from "./ReleaseDetailClient";
import type { PlayerTrack } from "@/types/playerTrack";
import { formatReleaseDate, formatTotalDuration } from "./_lib/format";
import { buildArtistsList } from "./_lib/artists";

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
  track_collaborators:
    | {
        role: string | null;
        profiles:
          | { id: string; display_name: string | null }
          | { id: string; display_name: string | null }[]
          | null;
      }[]
    | null;
};

type ReleaseTrackItem = {
  id: string;
  position: number | null;
  track: ReleaseTrackRelation | ReleaseTrackRelation[] | null;
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

  let hideExplicitTracks = false;

  if (user?.id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("hide_explicit_tracks")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    hideExplicitTracks = !!profile?.hide_explicit_tracks;
  }

  if (hideExplicitTracks) {
    const { data: explicitTracks, error: explicitTracksError } = await supabase
      .from("release_tracks")
      .select("id, tracks!inner(is_explicit)")
      .eq("release_id", releaseId)
      .eq("tracks.is_explicit", true)
      .limit(1);

    if (explicitTracksError) {
      throw explicitTracksError;
    }

    if ((explicitTracks ?? []).length > 0) {
      return (
        <div className="text-white">
          <div className="mb-3">
            <BackLink />
          </div>
          <h1 className="text-xl font-semibold">Release not available</h1>
          <p className="mt-2 text-sm text-white/60">
            This release contains explicit content and is hidden by your settings.
          </p>
        </div>
      );
    }
  }

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
        ),
        track_collaborators (
          role,
          profiles:profile_id (
            id,
            display_name
          )
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

  const releaseProfile = Array.isArray(release.profiles)
    ? release.profiles[0] ?? null
    : release.profiles;

  const artistName = releaseProfile?.display_name ?? "Unknown Artist";

  const trackCount = validItems.length;
  const totalSeconds = validItems.reduce(
    (sum, row) => sum + (getTrack(row)?.duration ?? 0),
    0
  );

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
      release_track_id: String(row.id),
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
      artists: buildArtistsList({
        track: t
          ? {
              artist: t.artist ?? null,
              track_collaborators: t.track_collaborators ?? null,
            }
          : null,
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
        <div className="relative px-4 md:px-8 pt-8 pb-12">
          <div className="mb-6">
            <BackLink />
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            {/* Cover */}
            <div className="shrink-0 relative group">
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt={release.title}
                  width={320}
                  height={320}
                  priority
                  className="rounded-xl shadow-2xl object-cover w-[220px] h-[220px] md:w-[280px] md:h-[280px]"
                />
              ) : (
                <div className="rounded-xl bg-neutral-800 w-[220px] h-[220px] md:w-[280px] md:h-[280px] shadow-2xl" />
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
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/70 font-medium mb-2">
                {release.release_type ? (
                  <span className="capitalize">{release.release_type}</span>
                ) : (
                  "Release"
                )}
              </div>

              <h1 className="text-6xl md:text-8xl font-black text-white leading-none break-words">
                {release.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/75">
                  <Link
                    href={`/dashboard/artist/${release.artist_id}`}
                    className="text-white font-semibold text-base md:text-lg hover:text-[#00FFC6] transition-colors cursor-pointer"
                  >
                    {artistName}
                  </Link>

                  {formatReleaseDate(release.release_date) ? (
                    <>
                      <span className="text-white/40">•</span>
                      <span>Released {formatReleaseDate(release.release_date)}</span>
                    </>
                  ) : null}

                  <span className="text-white/40">•</span>
                  <span>
                    {trackCount} {trackCount === 1 ? "track" : "tracks"}
                  </span>

                  {formatTotalDuration(totalSeconds) ? (
                    <>
                      <span className="text-white/40">•</span>
                      <span>{formatTotalDuration(totalSeconds)}</span>
                    </>
                  ) : null}
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

