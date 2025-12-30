"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type RateResult =
  | { ok: true; agg: { rating_avg: number | null; rating_count: number | null } }
  | { ok: false; error: string };

export async function rateReleaseTrackAction(formData: FormData): Promise<RateResult> {
  const releaseTrackIdEntry = formData.get("releaseTrackId");
  const starsEntry = formData.get("stars");

  const releaseTrackId =
    typeof releaseTrackIdEntry === "string"
      ? releaseTrackIdEntry.trim()
      : "";

  if (!releaseTrackId) {
    return { ok: false, error: "Invalid releaseTrackId" };
  }

  const starsValue =
    typeof starsEntry === "string"
      ? Number.parseInt(starsEntry, 10)
      : Number(starsEntry);

  if (!Number.isInteger(starsValue) || starsValue < 1 || starsValue > 5) {
    return { ok: false, error: "Stars must be an integer between 1 and 5" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const { data: releaseTrack, error: releaseTrackError } = await supabase
    .from("release_tracks")
    .select("track_id")
    .eq("id", releaseTrackId)
    .single();

  if (releaseTrackError || !releaseTrack) {
    return {
      ok: false,
      error: releaseTrackError?.message ?? "Release track not found",
    };
  }

  const { data: listenState, error: listenError } = await supabase
    .from("track_listen_state")
    .select("session_listened_seconds")
    .eq("user_id", user.id)
    .eq("track_id", releaseTrack.track_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (listenError) {
    return { ok: false, error: listenError.message };
  }

  if (!listenState || (listenState.session_listened_seconds ?? 0) < 30) {
    return {
      ok: false,
      error: "You can rate a track only after listening at least 30 seconds.",
    };
  }

  const { error: writeError } = await supabase.from("track_ratings").upsert(
    {
      release_track_id: releaseTrackId,
      user_id: user.id,
      stars: starsValue,
    },
    { onConflict: "release_track_id,user_id" }
  );

  if (writeError) {
    return {
      ok: false,
      error: "Artists can’t rate tracks. Ratings reflect listener feedback only.",
    };
  }

  const { error: rpcError } = await supabase.rpc("recalc_release_track_rating", {
    p_release_track_id: releaseTrackId,
  });

  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  const { data: agg, error: aggError } = await supabase
    .from("release_tracks")
    .select("rating_avg,rating_count")
    .eq("id", releaseTrackId)
    .single();

  if (aggError || !agg) {
    return { ok: false, error: aggError?.message ?? "Failed to load rating" };
  }

  return { ok: true, agg };
}

