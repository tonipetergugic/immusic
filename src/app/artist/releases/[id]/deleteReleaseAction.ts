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

  // IMPORTANT: Delete allowed ONLY when draft or withdrawn (never when published)
  if (!(release.status === "draft" || release.status === "withdrawn")) {
    return { error: "Release can only be deleted while draft or withdrawn." as const };
  }

  // 2. Delete all release_tracks entries
  const { error: tracksError } = await supabase
    .from("release_tracks")
    .delete()
    .eq("release_id", releaseId);

  if (tracksError) {
    console.error("Failed to delete release_tracks:", tracksError);
    return { error: "Failed to delete release tracks." };
  }

  // 3. Delete cover file (if exists)
  if (release.cover_path) {
    const { error: storageError } = await supabase.storage
      .from("release_covers")
      .remove([release.cover_path]);

    if (storageError) {
      console.error("Failed to delete cover file:", storageError);
      // continue deletion anyway
    }
  }

  // 4. Delete the release record
  const { error: deleteError } = await supabase
    .from("releases")
    .delete()
    .eq("id", releaseId)
    .eq("artist_id", user.id)
    .in("status", ["draft", "withdrawn"]);

  if (deleteError) {
    console.error("Failed to delete release row:", deleteError);
    return { error: "Failed to delete release." };
  }

  // 5. Redirect back to releases page
  redirect("/artist/releases");
}

