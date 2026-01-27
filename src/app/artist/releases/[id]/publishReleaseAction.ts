"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function publishReleaseAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  // Release laden (inkl. published_at)
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("title, cover_path, status, published_at")
    .eq("id", releaseId)
    .single();

  if (releaseError || !release) {
    return { error: "Release not found." };
  }

  // Hard rule: publish only once
  if (release.published_at || release.status === "published") {
    return { error: "This release is already published and cannot be republished. Delete and recreate it." };
  }

  // Validation
  if (!release.title || release.title.trim().length === 0) {
    return { error: "Title is required before publishing." };
  }

  if (!release.cover_path) {
    return { error: "Cover is required before publishing." };
  }

  // Track Count Validation (count-only, no data load)
  const { count, error: trackError } = await supabase
    .from("release_tracks")
    .select("id", { count: "exact", head: true })
    .eq("release_id", releaseId);

  if (trackError) {
    return { error: "Could not load tracks." };
  }

  if (!count || count < 1) {
    return { error: "You must add at least one track before publishing." };
  }

  // Wenn alles ok → veröffentlichen
  // DB trigger sets published_at on first publish and freezes afterwards
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

