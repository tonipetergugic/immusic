import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClientTrackRows from "./ClientTrackRows";
import ReleasePlayButton from "./ReleasePlayButton";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) return notFound();

  const supabase = await createSupabaseServerClient();

  const { data: artist } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", id)
    .maybeSingle();

  const { data: releases } = await supabase
    .from("releases")
    .select("id, title, cover_path, release_type, status")
    .eq("artist_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

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
      audio_path
    ),
    releases:releases!release_tracks_release_id_fkey(
      id,
      cover_path,
      title,
      status
    )
  `
    );

  const tracksByRelease: Record<string, any[]> = {};
  (releaseTracks ?? []).forEach((rt) => {
    if (!tracksByRelease[rt.release_id]) tracksByRelease[rt.release_id] = [];
    tracksByRelease[rt.release_id].push(rt);
  });

  if (!artist) return notFound();

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-800">
        {artist.avatar_url ? (
          <img src={artist.avatar_url} className="w-full h-full object-cover" />
        ) : null}
      </div>

      <h1 className="text-4xl font-bold text-white">
        {artist.display_name || "Unknown Artist"}
      </h1>

      <div className="mt-12 w-full">
        <h2 className="text-2xl font-semibold mb-6">Releases</h2>

        {releases && releases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {releases.map((rel) => {
              const coverUrl = rel.cover_path
                ? supabase.storage.from("release_covers").getPublicUrl(rel.cover_path).data.publicUrl
                : null;

              return (
                <div
                  key={rel.id}
                  className="rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition border border-white/10 p-5 flex flex-col gap-4 shadow-sm"
                >
                  <div className="relative group">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-neutral-800 rounded-lg" />
                    )}

                    <ReleasePlayButton tracks={tracksByRelease[rel.id] || []} />
                  </div>

                  <h3 className="text-lg font-semibold text-white truncate">
                    {rel.title}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-white/40">
                    {rel.release_type}
                  </p>

                  <hr className="border-white/10" />

                  <ClientTrackRows releaseId={rel.id} tracks={tracksByRelease[rel.id] || []} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">No releases yet.</p>
        )}
      </div>
    </div>
  );
}

