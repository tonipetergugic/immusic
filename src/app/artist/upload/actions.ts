"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitToQueueAction(formData: FormData) {
  const audioPath = formData.get("audio_path")?.toString();

  if (!audioPath) {
    throw new Error("No audio file uploaded.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  // Eintrag in Queue erstellen
  const { error } = await supabase.from("tracks_ai_queue").insert({
    user_id: user.id,
    audio_path: audioPath,
    status: "pending",
  });

  if (error) {
    console.error("Queue insert error:", error);
    throw new Error("Failed to queue track.");
  }

  // Später leiten wir hier auf eine Processing-Seite um
  redirect("/artist/upload/processing");
}
