"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateReleaseTitleAction(releaseId: string, newTitle: string) {
  if (!newTitle || newTitle.trim().length === 0) {
    return { error: "Title cannot be empty." as const };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated." as const };
  }

  const { data: rel, error: relErr } = await supabase
    .from("releases")
    .select("id, artist_id, status")
    .eq("id", releaseId)
    .maybeSingle();

  if (relErr || !rel) {
    return { error: "Release not found." as const };
  }

  if (rel.artist_id !== user.id) {
    return { error: "Not authorized." as const };
  }

  // IMPORTANT: Published is immutable (UI + server)
  if (rel.status === "published") {
    return { error: "This release is published and cannot be edited." as const };
  }

  const { error } = await supabase
    .from("releases")
    .update({ title: newTitle.trim() })
    .eq("id", releaseId)
    .eq("artist_id", user.id);

  if (error) {
    console.error("Failed to update release title:", error);
    return { error: "Failed to update title." as const };
  }

  return { success: true as const };
}

