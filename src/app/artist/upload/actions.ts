"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitToQueueAction(formData: FormData) {
  const audioPath = formData.get("audio_path")?.toString().trim();
  const title = formData.get("title")?.toString().trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!audioPath) {
    throw new Error("No audio file uploaded.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authErr } = await supabase.auth.getUser();

  if (authErr || !authData?.user) {
    throw new Error("Not authenticated.");
  }

  const userId = authData.user.id;

  // Guard 1: audio_path darf nur in den eigenen User-Prefix zeigen (verhindert manipulierte Hidden Inputs)
  if (!audioPath.startsWith(`${userId}/`)) {
    throw new Error("Invalid audio path.");
  }

  // Guard 2: keine Doppel-Queue (wenn bereits pending existiert → direkt weiter)
  const { data: existingPending, error: pendingErr } = await supabase
    .from("tracks_ai_queue")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(1);

  if (pendingErr) {
    throw new Error(`Failed to verify queue state: ${pendingErr.message}`);
  }

  if (existingPending && existingPending.length > 0) {
    redirect("/artist/upload/processing");
  }

  const { error } = await supabase.from("tracks_ai_queue").insert({
    user_id: userId,
    audio_path: audioPath,
    title,
    status: "pending",
  });

  if (error) {
    throw new Error(`Failed to queue track: ${error.message}`);
  }

  redirect("/artist/upload/processing");
}
