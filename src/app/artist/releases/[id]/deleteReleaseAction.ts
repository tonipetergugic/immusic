"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function deleteReleaseAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated." as const };
  }

  // 1. Load release (cover_path, status, artist_id)
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("id, cover_path, status, artist_id")
    .eq("id", releaseId)
    .maybeSingle();

  if (releaseError || !release) {
    console.error("Failed to load release:", releaseError);
    return { error: "Release not found." as const };
  }

  if (release.artist_id !== user.id) {
    return { error: "Not authorized." as const };
  }

  // IMPORTANT: Delete allowed for draft and published
  if (release.status !== "draft" && release.status !== "published") {
    return { error: "Release can only be deleted while in draft or published." as const };
  }

  // 2. Merke Tracks, für die dieses Release aktuell das Primary Release ist
  const { data: affectedPrimaryTracks, error: affectedPrimaryTracksError } = await supabase
    .from("tracks")
    .select("id")
    .eq("release_id", releaseId);

  if (affectedPrimaryTracksError) {
    console.error("Failed to load affected primary tracks:", affectedPrimaryTracksError);
    return { error: "Failed to prepare release deletion." as const };
  }

  const affectedTrackIds = (affectedPrimaryTracks ?? []).map((row) => row.id).filter(Boolean);

  // 3. Delete all release_tracks entries for this release
  const { error: tracksError } = await supabase
    .from("release_tracks")
    .delete()
    .eq("release_id", releaseId);

  if (tracksError) {
    console.error("Failed to delete release_tracks:", tracksError);
    return { error: "Failed to delete release tracks." as const };
  }

  // 4. Fallback primary release setzen für betroffene Tracks
  if (affectedTrackIds.length > 0) {
    const { data: remainingRows, error: remainingRowsError } = await supabase
      .from("release_tracks")
      .select("track_id, release_id, position")
      .in("track_id", affectedTrackIds)
      .order("position", { ascending: true });

    if (remainingRowsError) {
      console.error("Failed to load fallback release tracks:", remainingRowsError);
      return { error: "Failed to reassign primary release after deletion." as const };
    }

    const fallbackReleaseIdByTrackId = new Map<string, string | null>();

    for (const row of remainingRows ?? []) {
      if (!row.track_id) continue;
      if (!fallbackReleaseIdByTrackId.has(row.track_id)) {
        fallbackReleaseIdByTrackId.set(row.track_id, row.release_id ?? null);
      }
    }

    for (const trackId of affectedTrackIds) {
      const fallbackReleaseId = fallbackReleaseIdByTrackId.get(trackId) ?? null;

      const { error: updateTrackError } = await supabase
        .from("tracks")
        .update({ release_id: fallbackReleaseId })
        .eq("id", trackId);

      if (updateTrackError) {
        console.error("Failed to update track primary release:", {
          trackId,
          fallbackReleaseId,
          error: updateTrackError,
        });
        return { error: "Failed to reassign primary release after deletion." as const };
      }
    }
  }

  // 5. Delete cover file (if exists)
  if (release.cover_path) {
    const { error: storageError } = await supabase.storage
      .from("release_covers")
      .remove([release.cover_path]);

    if (storageError) {
      console.error("Failed to delete cover file:", storageError);
      // continue deletion anyway
    }
  }

  // 6. Delete the release record
  const { error: deleteError } = await supabase
    .from("releases")
    .delete()
    .eq("id", releaseId)
    .eq("artist_id", user.id)
    .in("status", ["draft", "published"]);

  if (deleteError) {
    console.error("Failed to delete release row:", deleteError);
    return { error: "Failed to delete release." as const };
  }

  // 7. Redirect back to releases page
  redirect("/artist/releases");
}

