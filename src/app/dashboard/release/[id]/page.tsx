import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import ReleaseBackButton from "./ReleaseBackButton";
import ReleaseTrackRowClient from "./ReleaseTrackRowClient";

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
          <ReleaseBackButton fallbackHref="/dashboard" />
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
        duration,
        bpm,
        key,
        genre
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

  function formatTotalDuration(sec: number) {
    if (!sec || sec <= 0) return null;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }

  function formatReleaseDate(d: any) {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(dt);
  }

  return (
    <div className="text-white">
      <div className="mb-4">
        <ReleaseBackButton fallbackHref="/dashboard" />
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        {coverUrl ? (
          <div className="relative w-[220px] sm:w-[260px] md:w-[320px] aspect-square overflow-hidden rounded-2xl">
            <Image
              src={coverUrl}
              alt={release.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 320px"
              priority
            />
          </div>
        ) : null}

        <div className="min-w-0 w-full">
          <div className="text-sm text-neutral-400">Release</div>
          <h1 className="text-2xl font-bold truncate">{release.title}</h1>
          <a
            href={`/dashboard/artist/${release.artist_id}`}
            className="mt-1 inline-block text-neutral-300 hover:text-[#00FFC6] transition cursor-pointer"
          >
            {artistName}
          </a>
          <div className="mt-2 text-sm text-neutral-400 flex flex-wrap items-center gap-x-2">
            {release.release_type ? (
              <span className="capitalize">{release.release_type}</span>
            ) : null}
            {release.release_type ? <span className="text-neutral-600">·</span> : null}

            {formatReleaseDate(release.release_date) ? (
              <>
                <span>Released {formatReleaseDate(release.release_date)}</span>
                <span className="text-neutral-600">·</span>
              </>
            ) : null}

            <span>
              {trackCount} {trackCount === 1 ? "track" : "tracks"}
            </span>

            {formatTotalDuration(totalSeconds) ? (
              <>
                <span className="text-neutral-600">·</span>
                <span>{formatTotalDuration(totalSeconds)}</span>
              </>
            ) : null}
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
                positionLabel={String(row.position ?? "")}
                track={{
                  id: row.track?.id,
                  title: row.track?.title ?? null,
                  bpm: row.track?.bpm ?? null,
                  key: row.track?.key ?? null,
                  genre: row.track?.genre ?? null,
                }}
                artistId={release.artist_id}
                artistName={artistName}
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

