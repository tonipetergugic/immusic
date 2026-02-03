"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function enableDevelopmentForReleaseAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Unauthorized." };

  // 1) Release prüfen + published only
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("id, status, artist_id")
    .eq("id", releaseId)
    .single();

  if (releaseError || !release) return { error: "Release not found." };
  if (!release.artist_id || release.artist_id !== user.id) return { error: "Forbidden." };
  if (release.status !== "published") return { error: "Release must be published first." };

  // 2) Alle track_ids holen (einmalig)
  const { data: relTracks, error: relTracksError } = await supabase
    .from("release_tracks")
    .select("track_id")
    .eq("release_id", releaseId);

  if (relTracksError) return { error: "Failed to load release tracks." };

  const trackIds = (relTracks ?? []).map((r) => r.track_id).filter(Boolean);
  if (trackIds.length === 0) return { error: "No tracks found in this release." };

  // 3) Für jeden Track: DB-Funktion nutzen (existiert bereits in deiner DB-Liste: move_track_to_development)
  //    Wichtig: idempotent behandeln -> wenn bereits in dev, soll es nicht crashen.
  for (const trackId of trackIds) {
    const { error } = await supabase.rpc("move_track_to_development", { p_track_id: trackId });
    if (error) {
      console.error("move_track_to_development failed:", { trackId, error });
      return { error: "Failed to enable development for all tracks." };
    }
  }

  return { success: true };
}

