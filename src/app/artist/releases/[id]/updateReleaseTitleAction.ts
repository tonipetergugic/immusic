"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateReleaseTitleAction(releaseId: string, newTitle: string) {
  if (!newTitle || newTitle.trim().length === 0) {
    return { error: "Title cannot be empty." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("releases")
    .update({ title: newTitle.trim() })
    .eq("id", releaseId);

  if (error) {
    console.error("Failed to update release title:", error);
    return { error: "Failed to update title." };
  }

  return { success: true };
}

