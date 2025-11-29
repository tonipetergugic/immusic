"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteTrackAction(trackId: string, audioPath: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error: dbError } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq("artist_id", user.id);

  if (dbError) {
    throw new Error("Failed to delete track");
  }

  if (audioPath) {
    await supabase.storage.from("tracks").remove([audioPath]);
  }

  revalidatePath("/artist/my-tracks");
}

export async function renameTrackAction(trackId: string, newTitle: string) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("tracks")
    .update({ title: newTitle })
    .eq("id", trackId)
    .eq("artist_id", user.id);

  if (error) {
    throw new Error("Failed to rename track");
  }

  revalidatePath("/artist/my-tracks");
}

