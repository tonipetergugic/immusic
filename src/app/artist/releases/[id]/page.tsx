import { createSupabaseServerClient } from "@/lib/supabase/server";
import ReleaseEditorClient from "./ReleaseEditorClient";

export default async function ReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-white p-6">
        <h1 className="text-2xl font-bold">Please login</h1>
      </div>
    );
  }

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

  const { data: eligibilityRows, error: eligibilityError } = existingTrackIds.length
    ? await supabase
        .from("analytics_development_signals")
        .select("track_id, is_development, exposure_completed, rating_count")
        .eq("artist_id", user.id)
        .in("track_id", existingTrackIds)
    : { data: [] as any[], error: null };

  if (eligibilityError) {
    throw eligibilityError;
  }

  const eligibilityByTrackId = (eligibilityRows ?? []).reduce(
    (
      acc: Record<
        string,
        { is_development: boolean; exposure_completed: boolean; rating_count: number }
      >,
      r: any
    ) => {
      acc[r.track_id] = {
        is_development: !!r.is_development,
        exposure_completed: !!r.exposure_completed,
        rating_count: typeof r.rating_count === "number" ? r.rating_count : 0,
      };
      return acc;
    },
    {}
  );

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
      eligibilityByTrackId={eligibilityByTrackId}
    />
  );
}

