import { createSupabaseServerClient } from "@/lib/supabase/server";
import ReleaseEditorClient from "./ReleaseEditorClient";

export default async function ReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: release, error } = await supabase
    .from("releases")
    .select("id, title, release_type, cover_path, created_at, status")
    .eq("id", id)
    .single();

  if (!release || error) {
    return (
      <div className="text-white p-6">
        <h1 className="text-2xl font-bold">Release not found</h1>
      </div>
    );
  }

  const coverUrl = release.cover_path
    ? supabase.storage.from("release_covers").getPublicUrl(release.cover_path).data.publicUrl
    : null;

  const { data: tracks } = await supabase
    .from("release_tracks")
    .select("track_id, track_title, position, release_id")
    .eq("release_id", release.id)
    .order("position", { ascending: true });

  const initialTracks = tracks ?? [];
  const existingTrackIds = initialTracks.map((t) => t.track_id);

  const { data: incompleteMeta } = existingTrackIds.length
    ? await supabase
        .from("tracks")
        .select("id")
        .in("id", existingTrackIds)
        .or("bpm.is.null,key.is.null,genre.is.null")
    : { data: [] as any[] };

  const allTracksMetadataComplete =
    existingTrackIds.length > 0 && (incompleteMeta?.length ?? 0) === 0;

  return (
    <ReleaseEditorClient
      releaseId={release.id}
      releaseData={{
        title: release.title,
        release_type: release.release_type,
        created_at: release.created_at,
        status: release.status,
      }}
      initialTracks={initialTracks}
      existingTrackIds={existingTrackIds}
      coverUrl={coverUrl}
      allTracksMetadataComplete={allTracksMetadataComplete}
    />
  );
}

