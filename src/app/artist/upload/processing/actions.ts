"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function processQueuedTrack(queueId: string, action: "approve" | "reject") {
  const supabase = await createSupabaseServerClient();

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

  // REJECT → delete file & queue entry
  if (action === "reject") {
    // 1) Update status first
    await supabase
      .from("tracks_ai_queue")
      .update({ status: "rejected" })
      .eq("id", queueId);

    // 2) Remove audio file
    await supabase.storage.from("tracks").remove([audioPath]);

    // 3) Delete queue entry
    await supabase.from("tracks_ai_queue").delete().eq("id", queueId);

    return;
  }

  // APPROVE → create release draft
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .insert({
      artist_id: queueItem.user_id,
      title: "Untitled Release",
      cover_path: null,
      status: "draft",
    })
    .select()
    .single();

  if (releaseError || !release) {
    throw new Error("Failed to create release draft.");
  }

  // Create track
  const { error: trackError } = await supabase
    .from("tracks")
    .insert({
      artist_id: queueItem.user_id,
      release_id: release.id,
      audio_path: audioPath,
      title: "Untitled Track",
      status: "approved",
    });

  if (trackError) {
    throw new Error("Failed to insert track.");
  }

  await supabase
    .from("tracks_ai_queue")
    .update({ status: "approved" })
    .eq("id", queueId);

  await supabase.from("tracks_ai_queue").delete().eq("id", queueId);

  // Redirect to Release Editor
  redirect(`/artist/releases/${release.id}`);
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
