"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function processQueuedTrack(queueId: string, action: "approve" | "reject") {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  // Load queue item
  const { data: queueItem, error: fetchError } = await supabase
    .from("tracks_ai_queue")
    .select("*")
    .eq("id", queueId)
    .single();

  if (fetchError || !queueItem) {
    throw new Error("Queue item not found.");
  }

  const audioPath = queueItem.audio_path;

  if (action === "reject") {
    // 1) Mark queue item as rejected
    await supabase
      .from("tracks_ai_queue")
      .update({ status: "rejected" })
      .eq("id", queueId);

    // 2) Try to remove audio file from storage
    const { error: storageError } = await supabase.storage.from("tracks").remove([audioPath]);

    if (storageError) {
      console.error("Storage delete error on reject:", storageError);
      throw new Error("Failed to delete audio file on reject.");
    }

    // 3) Keep the queue entry (do NOT delete it)
    return;
  }

  // APPROVE → create standalone track
  const { error: trackError } = await supabase.from("tracks").insert({
    artist_id: queueItem.user_id,
    audio_path: audioPath,
    title: "Untitled Track",
    status: "approved",
  });

  if (trackError) {
    throw new Error("Failed to insert track.");
  }

  await supabase.from("tracks_ai_queue").update({ status: "approved" }).eq("id", queueId);

  redirect("/artist/my-tracks");
}

export async function rejectQueueItemAction(formData: FormData) {
  "use server";

  const queueId = formData.get("queue_id")?.toString();
  const message = formData.get("message")?.toString() ?? null;

  if (!queueId) {
    throw new Error("Missing queue_id.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  // Load queue item to get audio_path
  const { data: queueItem, error: fetchError } = await supabase
    .from("tracks_ai_queue")
    .select("*")
    .eq("id", queueId)
    .single();

  if (fetchError || !queueItem) {
    throw new Error("Queue item not found.");
  }

  const audioPath = queueItem.audio_path as string | null;

  // Delete audio file from storage if present
  if (audioPath) {
    const { error: storageError } = await supabase.storage.from("tracks").remove([audioPath]);

    if (storageError) {
      console.error("Storage delete error on reject:", storageError);
      throw new Error("Failed to delete audio file on reject.");
    }
  }

  // Update queue status and message, keep entry
  const { error } = await supabase
    .from("tracks_ai_queue")
    .update({ status: "rejected", message })
    .eq("id", queueId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Failed to reject queue item.");
  }

  redirect("/artist/upload/processing?rejected=true");
}
