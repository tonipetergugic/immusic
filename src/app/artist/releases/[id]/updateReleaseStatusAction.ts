"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateReleaseStatusAction(releaseId: string, newStatus: string) {
  const supabase = await createSupabaseServerClient();

  // After our DB rule: Only "draft" is allowed via this action.
  // Publishing must go through publishReleaseAction (with validation).
  if (newStatus !== "draft") {
    return { error: "Invalid status. Use Publish to publish a release." };
  }

  // Guard: published releases are immutable (DB enforces it, but we return a clean message)
  const { data: current, error: currentError } = await supabase
    .from("releases")
    .select("status, published_at")
    .eq("id", releaseId)
    .single();

  if (currentError || !current) {
    return { error: "Release not found." };
  }

  if (current.published_at || current.status === "published") {
    return { error: "This release is already published and cannot be changed. Delete and recreate it." };
  }

  const { error } = await supabase
    .from("releases")
    .update({ status: "draft" })
    .eq("id", releaseId);

  if (error) {
    console.error("Failed to update status:", error);
    return { error: "Failed to update status." };
  }

  return { success: true };
}
