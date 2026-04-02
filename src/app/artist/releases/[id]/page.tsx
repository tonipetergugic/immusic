import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ReleaseEditorClient from "./ReleaseEditorClient";

type TrackRow = {
  id: string;
  title: string | null;
  version: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  status: string | null;
};

type BoostRow = {
  track_id: string;
  enabled: boolean | null;
};

type EligibilityRow = {
  track_id: string;
  track_status: string | null;
  is_development: boolean | null;
  exposure_completed: boolean | null;
  rating_count: number | null;
  avg_stars: number | null;
};

export default async function ReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("id, artist_id, title, release_type, cover_path, created_at, updated_at, status, published_at")
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

  const { data: rawTracks, error: rawTracksError } = await supabase
    .from("release_tracks")
    .select("track_id, position, release_id")
    .eq("release_id", release.id)
    .order("position", { ascending: true });

  if (rawTracksError) {
    throw rawTracksError;
  }

  const baseTracks =
    rawTracks?.map((t) => ({
      track_id: t.track_id,
      track_title: null as string | null,
      position: t.position,
      release_id: t.release_id,
    })) ?? [];

  const existingTrackIds = baseTracks.map((t) => t.track_id);

  // --- Tracks lookup (single query) ---
  const { data: trackRows, error: trackErr } = existingTrackIds.length
    ? await supabase
        .from("tracks")
        .select("id, title, version, bpm, key, genre, status")
        .in("id", existingTrackIds)
    : { data: [] as TrackRow[], error: null };

  if (trackErr) {
    throw trackErr;
  }

  const trackTitleById = (trackRows ?? []).reduce(
    (acc: Record<string, string | null>, r: TrackRow) => {
      acc[r.id] = r.title ?? null;
      return acc;
    },
    {},
  );

  const initialTracks = baseTracks.map((t) => ({
    ...t,
    track_title: trackTitleById[t.track_id] ?? "Untitled",
  }));

  const missingTrackRows =
    existingTrackIds.length > 0 && (trackRows ?? []).length !== existingTrackIds.length;
  const hasMissingMeta = (trackRows ?? []).some(
    (r: TrackRow) => r.bpm == null || r.key == null || r.genre == null,
  );

  const allTracksMetadataComplete =
    existingTrackIds.length > 0 && !missingTrackRows && !hasMissingMeta;

  const hasInvalidTrackStatus = (trackRows ?? []).some(
    (r: TrackRow) =>
      r.status !== "approved" &&
      r.status !== "development" &&
      r.status !== "performance",
  );

  const allTracksHavePublishableStatus =
    existingTrackIds.length > 0 && !missingTrackRows && !hasInvalidTrackStatus;

  // --- Boost opt-in states ---
  const { data: boostRows, error: boostErr } = existingTrackIds.length
    ? await supabase
        .from("artist_track_boost_optin")
        .select("track_id, enabled")
        .eq("artist_id", user.id)
        .in("track_id", existingTrackIds)
    : { data: [] as BoostRow[], error: null };

  if (boostErr) {
    throw boostErr;
  }

  const boostEnabledById = (boostRows ?? []).reduce(
    (acc: Record<string, boolean>, r: BoostRow) => {
      acc[r.track_id] = !!r.enabled;
      return acc;
    },
    {}
  );

  const { data: eligibilityRows, error: eligibilityError } = existingTrackIds.length
    ? await supabase
        .from("analytics_development_signals")
        .select("track_id, track_status, is_development, exposure_completed, rating_count, avg_stars")
        .eq("artist_id", user.id)
        .in("track_id", existingTrackIds)
    : { data: [] as EligibilityRow[], error: null };

  if (eligibilityError) {
    throw eligibilityError;
  }

  const eligibilityByTrackId = (eligibilityRows ?? []).reduce(
    (
      acc: Record<
        string,
        {
          track_status: string | null;
          is_development: boolean;
          exposure_completed: boolean;
          rating_count: number;
          avg_stars: number | null;
        }
      >,
      r: EligibilityRow
    ) => {
      acc[r.track_id] = {
        track_status: typeof r.track_status === "string" ? r.track_status : null,
        is_development: !!r.is_development,
        exposure_completed: !!r.exposure_completed,
        rating_count: typeof r.rating_count === "number" ? r.rating_count : 0,
        avg_stars: typeof r.avg_stars === "number" ? r.avg_stars : null,
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
        updated_at: release.updated_at,
        status: release.status,
        published_at: release.published_at,
      }}
      initialTracks={initialTracks}
      existingTrackIds={existingTrackIds}
      coverUrl={coverUrl}
      allTracksMetadataComplete={allTracksMetadataComplete}
      allTracksHavePublishableStatus={allTracksHavePublishableStatus}
      eligibilityByTrackId={eligibilityByTrackId}
      boostEnabledById={boostEnabledById}
    />
  );
}

