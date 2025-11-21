"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function uploadTrackAction(data: {
  title: string;
  bpm: number;
  key: string;
  audioUrl: string;
  coverUrl: string;
}) {
  console.log("SERVER ACTION START — uploadTrackAction");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("SERVER ACTION USER:", user);
  if (!user) {
    throw new Error("Not authenticated");
  }

  // Validation
  if (!data.title || typeof data.title !== "string") {
    throw new Error("Invalid title");
  }
  if (!data.bpm || isNaN(data.bpm)) {
    throw new Error("Invalid BPM");
  }
  if (!data.key || typeof data.key !== "string") {
    throw new Error("Invalid key");
  }
  if (!data.audioUrl || typeof data.audioUrl !== "string") {
    throw new Error("Invalid audio URL");
  }
  if (!data.coverUrl || typeof data.coverUrl !== "string") {
    throw new Error("Invalid cover URL");
  }

  const insertData = {
    title: data.title,
    bpm: data.bpm,
    key: data.key,
    audio_url: data.audioUrl,
    cover_url: data.coverUrl,
    artist_id: user.id,
  };

  const { error } = await supabase.from("tracks").insert(insertData);

  if (error) {
    console.error(error);
    throw new Error("Failed to insert track into database");
  }

  console.log("SERVER ACTION DONE — Redirect");
  redirect("/artist/dashboard");
}

