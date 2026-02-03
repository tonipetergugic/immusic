"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function publishReleaseAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated." };
  }

  // Release laden (inkl. published_at)
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("artist_id, title, cover_path, status, published_at")
    .eq("id", releaseId)
    .eq("artist_id", user.id)
    .maybeSingle();

  if (releaseError || !release) {
    return { error: "Release not found." };
  }

  // Hard rule: publish only once
  if (release.published_at || release.status === "published") {
    return { error: "This release is already published and cannot be republished." };
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

  // Server-side metadata completeness check (bpm, key, genre)
  const { data: releaseTrackRows, error: releaseTrackErr } = await supabase
    .from("release_tracks")
    .select("track_id")
    .eq("release_id", releaseId);

  if (releaseTrackErr) {
    return { error: "Could not load release tracks." };
  }

  const trackIds = (releaseTrackRows ?? []).map((r: any) => r.track_id).filter(Boolean);

  if (trackIds.length < 1) {
    return { error: "You must add at least one track before publishing." };
  }

  const { data: metaRows, error: metaErr } = await supabase
    .from("tracks")
    .select("id, bpm, key, genre")
    .in("id", trackIds);

  if (metaErr) {
    return { error: "Could not validate track metadata." };
  }

  const missingMeta =
    (metaRows ?? []).length !== trackIds.length ||
    (metaRows ?? []).some((t: any) => t.bpm == null || t.key == null || t.genre == null);

  if (missingMeta) {
    return { error: "Track metadata incomplete. Please fill BPM, key and genre for all tracks before publishing." };
  }

  // Wenn alles ok → veröffentlichen
  // DB trigger sets published_at on first publish and freezes afterwards
  const { error: updateError } = await supabase
    .from("releases")
    .update({ status: "published" })
    .eq("id", releaseId)
    .eq("artist_id", user.id)
    .eq("status", "draft");

  if (updateError) {
    console.error("Publish failed:", updateError);
    return { error: "Failed to publish the release." };
  }

  revalidatePath(`/artist/releases/${releaseId}`);
  revalidatePath("/artist/releases");

  return { success: true };
}

