"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateReleaseTypeAction(releaseId: string, newType: string) {
  const normalized = newType.trim().toLowerCase();

  if (!normalized) {
    return { error: "Release type cannot be empty." };
  }

  // optionally limit to known types: single / ep / album
  const allowedTypes = ["single", "ep", "album"];
  if (!allowedTypes.includes(normalized)) {
    return { error: "Invalid release type." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("releases")
    .update({ release_type: normalized })
    .eq("id", releaseId);

  if (error) {
    console.error("Failed to update release type:", error);
    return { error: "Failed to update release type." };
  }

  return { success: true };
}

