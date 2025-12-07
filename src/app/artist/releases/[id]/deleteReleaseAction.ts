"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function deleteReleaseAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  // 1. Load release (to get cover_path)
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("id, cover_path")
    .eq("id", releaseId)
    .single();

  if (releaseError || !release) {
    console.error("Failed to load release:", releaseError);
    return { error: "Release not found." };
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
    .eq("id", releaseId);

  if (deleteError) {
    console.error("Failed to delete release row:", deleteError);
    return { error: "Failed to delete release." };
  }

  // 5. Redirect back to releases page
  redirect("/artist/releases");
}

