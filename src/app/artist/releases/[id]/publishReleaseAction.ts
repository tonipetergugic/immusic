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

  const { data, error } = await supabase.rpc("publish_release_atomically", {
    p_release_id: releaseId,
  });

  if (error) {
    console.error("publish_release_atomically failed:", error);
    return { error: error.message || "Failed to publish the release." };
  }

  if (!data) {
    return { error: "Publish RPC returned no data." };
  }

  revalidatePath(`/artist/releases/${releaseId}`);
  revalidatePath("/artist/releases");

  return { success: true };
}

