"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function publishReleaseAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  // Release laden
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("title, cover_path, status")
    .eq("id", releaseId)
    .single();

  if (releaseError || !release) {
    return { error: "Release not found." };
  }

  // Validation
  if (!release.title || release.title.trim().length === 0) {
    return { error: "Title is required before publishing." };
  }

  if (!release.cover_path) {
    return { error: "Cover is required before publishing." };
  }

  // Track Count Validation
  const { data: tracks, error: trackError } = await supabase
    .from("release_tracks")
    .select("track_id")
    .eq("release_id", releaseId);

  if (trackError || !tracks) {
    return { error: "Could not load tracks." };
  }

  if (tracks.length === 0) {
    return { error: "You must add at least one track before publishing." };
  }

  // Wenn alles ok → veröffentlichen
  const { error: updateError } = await supabase
    .from("releases")
    .update({ status: "published" })
    .eq("id", releaseId);

  if (updateError) {
    console.error("Publish failed:", updateError);
    return { error: "Failed to publish the release." };
  }

  return { success: true };
}

