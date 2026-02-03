import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
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

  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("id, artist_id, title, release_type, cover_path, created_at, status, published_at")
    .eq("id", id)
    .eq("artist_id", user.id)
    .maybeSingle();

  if (releaseError) {
    throw releaseError;
  }

  if (!release) {
    notFound();
  }

  const coverUrl = release.cover_path
    ? supabase.storage.from("release_covers").getPublicUrl(release.cover_path).data.publicUrl
    : null;

  const { data: rawTracks } = await supabase
    .from("release_tracks")
    .select("track_id, track_title, position, release_id")
    .eq("release_id", release.id)
    .order("position", { ascending: true });

  const baseTracks =
    rawTracks?.map((t) => ({
      track_id: t.track_id,
      track_title: t.track_title,
      track_version: null as string | null, // filled from tracks table below
      position: t.position,
      release_id: t.release_id,
    })) ?? [];

  const existingTrackIds = baseTracks.map((t) => t.track_id);

  // --- Premium Credits (for Boost UI) ---
  const { data: creditsRow, error: creditsErr } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .single();

  if (creditsErr && creditsErr.code !== "PGRST116") {
    throw creditsErr;
  }

  const premiumBalance = creditsRow?.balance ?? 0;

  // --- Tracks lookup (single query) ---
  const { data: trackRows, error: trackErr } = existingTrackIds.length
    ? await supabase
        .from("tracks")
        .select("id, status, version, bpm, key, genre")
        .in("id", existingTrackIds)
    : { data: [] as any[], error: null };

  if (trackErr) {
    throw trackErr;
  }

  const trackStatusById = (trackRows ?? []).reduce((acc: Record<string, string>, r: any) => {
    acc[r.id] = String(r.status ?? "");
    return acc;
  }, {});

  const trackVersionById = (trackRows ?? []).reduce(
    (acc: Record<string, string | null>, r: any) => {
      acc[r.id] = (r.version ?? null) as string | null;
      return acc;
    },
    {},
  );

  const initialTracks = baseTracks.map((t) => ({
    ...t,
    track_version: trackVersionById[t.track_id] ?? null,
  }));

  const missingTrackRows =
    existingTrackIds.length > 0 && (trackRows ?? []).length !== existingTrackIds.length;
  const hasMissingMeta = (trackRows ?? []).some(
    (r: any) => r.bpm == null || r.key == null || r.genre == null,
  );

  const allTracksMetadataComplete =
    existingTrackIds.length > 0 && !missingTrackRows && !hasMissingMeta;

  // --- Boost opt-in states ---
  const { data: boostRows, error: boostErr } = existingTrackIds.length
    ? await supabase
        .from("artist_track_boost_optin")
        .select("track_id, enabled")
        .eq("artist_id", user.id)
        .in("track_id", existingTrackIds)
    : { data: [] as any[], error: null };

  if (boostErr) {
    throw boostErr;
  }

  const boostEnabledById = (boostRows ?? []).reduce((acc: Record<string, boolean>, r: any) => {
    acc[r.track_id] = !!r.enabled;
    return acc;
  }, {});

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

  return (
    <ReleaseEditorClient
      releaseId={release.id}
      releaseData={{
        title: release.title,
        release_type: release.release_type,
        created_at: release.created_at,
        status: release.status,
        published_at: release.published_at,
      }}
      initialTracks={initialTracks}
      existingTrackIds={existingTrackIds}
      coverUrl={coverUrl}
      allTracksMetadataComplete={allTracksMetadataComplete}
      eligibilityByTrackId={eligibilityByTrackId}
      premiumBalance={premiumBalance}
      trackStatusById={trackStatusById}
      boostEnabledById={boostEnabledById}
    />
  );
}

