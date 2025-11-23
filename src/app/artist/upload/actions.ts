"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function uploadTrackAction(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("SERVER ACTION USER:", user);

  if (!user) {
    throw new Error("Not authenticated");
  }

  const title = form.get("title") as string;
  const bpm = Number(form.get("bpm"));
  const key = form.get("key") as string;
  const audioUrl = form.get("audioUrl") as string;
  const coverUrl = form.get("coverUrl") as string;

  const { error } = await supabase.from("tracks").insert({
    artist_id: user.id,
    title,
    bpm,
    key,
    audio_url: audioUrl,
    cover_url: coverUrl,
  });

  if (error) throw new Error(error.message);

  return { success: true };
}

