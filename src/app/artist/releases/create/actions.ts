"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createReleaseAction(formData: FormData) {
  const title = formData.get("title")?.toString().trim();
  const releaseType = formData.get("release_type")?.toString();
  const coverPath = formData.get("cover_temp_path")?.toString();
  const selectedTracksRaw = formData.get("selected_tracks")?.toString();
  const selectedTracks = selectedTracksRaw ? JSON.parse(selectedTracksRaw) : [];

  if (!title || !releaseType) {
    throw new Error("Missing fields.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: releaseData, error: releaseError } = await supabase
    .from("releases")
    .insert({
      artist_id: user.id,
      title,
      release_type: releaseType,
      cover_path: coverPath,
    })
    .select("id")
    .single();

  if (releaseError || !releaseData) {
    throw new Error("Failed to create release.");
  }

  if (selectedTracks.length > 0) {
    const inserts = selectedTracks.map((track: any, index: number) => ({
      release_id: releaseData.id,
      track_id: track.id,
      track_title: track.title,
      position: index,
    }));

    const { error: trackLinkError } = await supabase
      .from("release_tracks")
      .insert(inserts);

    if (trackLinkError) {
      throw new Error("Failed linking tracks to release.");
    }
  }

  redirect("/artist/releases");
}

