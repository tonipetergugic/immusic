"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function rateReleaseTrackAction(formData: FormData) {
  const releaseTrackIdEntry = formData.get("releaseTrackId");
  const starsEntry = formData.get("stars");

  const releaseTrackId =
    typeof releaseTrackIdEntry === "string"
      ? releaseTrackIdEntry.trim()
      : "";

  if (!releaseTrackId) {
    throw new Error("Invalid releaseTrackId");
  }

  const starsValue =
    typeof starsEntry === "string"
      ? Number.parseInt(starsEntry, 10)
      : Number(starsEntry);

  if (!Number.isInteger(starsValue) || starsValue < 1 || starsValue > 5) {
    throw new Error("Stars must be an integer between 1 and 5");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: writeData, error: writeError } = await supabase.from("track_ratings").upsert(
    {
      release_track_id: releaseTrackId,
      user_id: user.id,
      stars: starsValue,
    },
    { onConflict: "release_track_id,user_id" }
  );

  if (writeError) {
    throw writeError;
  }

  const { error: rpcError } = await supabase.rpc("recalc_release_track_rating", {
    p_release_track_id: releaseTrackId,
  });

  if (rpcError) {
    throw rpcError;
  }

  const { data: agg, error: aggError } = await supabase
    .from("release_tracks")
    .select("rating_avg,rating_count")
    .eq("id", releaseTrackId)
    .single();

  if (aggError) {
    throw aggError;
  }

  return agg;
}

