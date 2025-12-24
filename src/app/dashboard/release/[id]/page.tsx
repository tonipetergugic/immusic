import { createSupabaseServerClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import ReleaseDetailClient from "./ReleaseDetailClient";
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
      profiles:artist_id ( display_name )
    `
    )
    .eq("id", releaseId)
    .single();

  if (error || !release) {
    return (
      <div className="p-6 text-white">
        <div className="text-sm text-neutral-400 mb-3">
          <Link href="/dashboard">← Back</Link>
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
        key
      )
    `
    )
    .eq("release_id", releaseId)
    .order("position", { ascending: true });

  const artistName =
    (release as any)?.profiles?.display_name ?? "Unknown Artist";

  return (
    <div className="p-6 text-white">
      <div className="text-sm text-neutral-400 mb-4">
        <Link href="/dashboard">← Back</Link>
      </div>

      <div className="flex gap-8 items-start">
        <div className="relative h-56 w-56 rounded-2xl overflow-hidden bg-neutral-900 shrink-0">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${release.title} cover`}
              fill
              className="object-cover"
              sizes="224px"
              priority
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="text-sm text-neutral-400">Release</div>
          <h1 className="text-2xl font-bold truncate">{release.title}</h1>
          <a
            href={`/dashboard/artist/${release.artist_id}`}
            className="mt-1 inline-block text-neutral-300 hover:text-[#00FFC6] transition cursor-pointer"
          >
            {artistName}
          </a>
          <div className="mt-3">
            <ReleaseDetailClient releaseId={releaseId} />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Tracks</h2>

        {items?.length ? (
          <div className="divide-y divide-neutral-800 rounded-xl overflow-hidden border border-neutral-800">
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
                }}
                artistId={release.artist_id}
                ratingAvg={row.rating_avg ?? null}
                ratingCount={row.rating_count ?? null}
                streamCount={row.stream_count ?? 0}
                duration={row.track?.duration ?? null}
                releaseTrackId={row.id}
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

