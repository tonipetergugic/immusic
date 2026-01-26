import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";
import BackLink from "@/components/BackLink";
import ReleaseTrackRowClient from "./ReleaseTrackRowClient";
import type { PlayerTrack } from "@/types/playerTrack";
import { formatReleaseDate, formatTotalDuration } from "./_lib/format";
import { buildArtistsList } from "./_lib/artists";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id: releaseId } = await params;

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
  const { data: items } = await supabase
    .from("release_tracks")
    .select(
      `
      id,
      position,
      rating_avg,
      rating_count,
      stream_count,
      track:tracks (
        id,
        title,
        audio_path,
        duration,
        bpm,
        key,
        genre,
        version,
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

  const artistName =
    (release as any)?.profiles?.display_name ?? "Unknown Artist";

  const trackCount = items?.length ?? 0;
  const totalSeconds = (items ?? []).reduce(
    (sum: number, row: any) => sum + (row?.track?.duration ?? 0),
    0
  );

  // Build Player queue SERVER-side (no client fetch)
  const playerQueue: PlayerTrack[] = (items ?? [])
    .map((row: any) => {
      const t = row?.track;
      if (!t?.id || !t?.audio_path) return null;

      const { data: audioPublic } = supabase.storage
        .from("tracks")
        .getPublicUrl(t.audio_path);

      const audio_url = audioPublic?.publicUrl ?? null;
      if (!audio_url) return null;

      return {
        id: String(t.id),
        title: String(t.title ?? "Untitled"),
        artist_id: String(t.artist_id ?? ""),
        audio_url,
        cover_url: coverUrl ?? null,
        bpm: t.bpm ?? null,
        key: t.key ?? null,
        profiles: t.artist?.display_name
          ? { display_name: String(t.artist.display_name) }
          : undefined,
        release_id: String(releaseId),
        release_track_id: row?.id ? String(row.id) : null,
      } as PlayerTrack;
    })
    .filter(Boolean) as PlayerTrack[];

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
            <div className="shrink-0">
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

              <h1 className="text-5xl md:text-7xl font-black text-white leading-none break-words">
                {release.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/75">
                <a
                  href={`/dashboard/artist/${release.artist_id}`}
                  className="text-white font-semibold text-base md:text-lg hover:text-[#00FFC6] transition-colors"
                >
                  {artistName}
                </a>

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

              {/* bewusst: KEIN globaler Play-Button im Release-Header */}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Tracks</h2>

        {items?.length ? (
          <div className="divide-y divide-white/10">
            {items.map((row: any, index: number) => (
              <ReleaseTrackRowClient
                key={row.id}
                releaseId={releaseId}
                startIndex={index}
                playerQueue={playerQueue}
                positionLabel={String(row.position ?? "")}
                track={{
                  id: row.track?.id,
                  title: row.track?.title ?? null,
                  bpm: row.track?.bpm ?? null,
                  key: row.track?.key ?? null,
                  genre: row.track?.genre ?? null,
                  version: row.track?.version ?? null,
                }}
                artists={buildArtistsList(row)}
                ratingAvg={row.rating_avg ?? null}
                ratingCount={row.rating_count ?? null}
                streamCount={row.stream_count ?? 0}
                duration={row.track?.duration ?? null}
                releaseTrackId={row.id}
                releaseCoverUrl={coverUrl}
              />
            ))}
          </div>
        ) : (
          <div className="text-neutral-400">No tracks found.</div>
        )}
      </div>
    </div>
  );
}

