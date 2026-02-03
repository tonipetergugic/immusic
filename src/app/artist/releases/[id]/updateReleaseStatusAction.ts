"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateReleaseStatusAction(releaseId: string, newStatus: string) {
  const supabase = await createSupabaseServerClient();

  // Only Draft can be set via this action
  if (newStatus !== "draft") {
    return { error: "Invalid status. Use Publish to publish a release." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated." };
  }

  const { data: current, error: currentError } = await supabase
    .from("releases")
    .select("id, artist_id, status, published_at")
    .eq("id", releaseId)
    .maybeSingle();

  if (currentError || !current) {
    return { error: "Release not found." };
  }

  if (current.artist_id !== user.id) {
    return { error: "Not authorized." };
  }

  // If it was ever published, never allow draft transitions
  if (current.published_at) {
    return { error: "This release has been published before and cannot be set back to draft." };
  }

  // Safety: block if already published/withdrawn
  if (current.status === "published" || current.status === "withdrawn") {
    return { error: "This release cannot be changed." };
  }

  const { error } = await supabase
    .from("releases")
    .update({ status: "draft" })
    .eq("id", releaseId)
    .eq("artist_id", user.id);

  if (error) {
    console.error("Failed to update status:", error);
    return { error: "Failed to update status." };
  }

  return { success: true };
}
