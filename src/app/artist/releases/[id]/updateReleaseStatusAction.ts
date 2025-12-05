"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateReleaseStatusAction(releaseId: string, newStatus: string) {
  const supabase = await createSupabaseServerClient();

  const allowed = ["draft", "published"];
  if (!allowed.includes(newStatus)) {
    return { error: "Invalid status." };
  }

  const { error } = await supabase
    .from("releases")
    .update({ status: newStatus })
    .eq("id", releaseId);

  if (error) {
    console.error("Failed to update status:", error);
    return { error: "Failed to update status." };
  }

  return { success: true };
}

