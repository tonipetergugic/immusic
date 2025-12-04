"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateReleaseCoverAction(releaseId: string, newFilePath: string) {
  const supabase = await createSupabaseServerClient();

  const { data: release, error: fetchError } = await supabase
    .from("releases")
    .select("cover_path")
    .eq("id", releaseId)
    .single();

  if (fetchError || !release) {
    throw new Error("Failed to load release.");
  }

  if (release.cover_path && release.cover_path !== newFilePath) {
    const { error: removeError } = await supabase.storage
      .from("release_covers")
      .remove([release.cover_path]);

    if (removeError) {
      throw new Error("Failed to remove existing cover.");
    }
  }

  const { error: updateError } = await supabase
    .from("releases")
    .update({ cover_path: newFilePath })
    .eq("id", releaseId);

  if (updateError) {
    throw new Error("Failed to update the cover.");
  }

  revalidatePath(`/artist/releases/${releaseId}`);
}

export async function deleteReleaseCoverAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: release } = await supabase
    .from("releases")
    .select("cover_path")
    .eq("id", releaseId)
    .single();

  if (release?.cover_path) {
    await supabase.storage.from("release_covers").remove([release.cover_path]);
  }

  await supabase.from("releases").update({ cover_path: null }).eq("id", releaseId);

  revalidatePath(`/artist/releases/${releaseId}`);
}

export async function addTrackToReleaseAction(releaseId: string, trackId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: track } = await supabase
    .from("tracks")
    .select("id, title")
    .eq("id", trackId)
    .single();

  if (!track) {
    return { error: "Track not found." };
  }

  const { data: maxPos } = await supabase
    .from("release_tracks")
    .select("position")
    .eq("release_id", releaseId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = maxPos ? maxPos.position + 1 : 1;

  const { error } = await supabase.from("release_tracks").insert({
    release_id: releaseId,
    track_id: track.id,
    track_title: track.title,
    position: nextPosition,
  });

  if (error) {
    return { error: "Failed to add track to release." };
  }

  revalidatePath(`/artist/releases/${releaseId}`);

  return { success: true };
}

export async function removeTrackFromReleaseAction(releaseId: string, trackId: string) {
  const supabase = await createSupabaseServerClient();

  await supabase.from("release_tracks").delete().eq("release_id", releaseId).eq("track_id", trackId);

  const { data: remaining } = await supabase
    .from("release_tracks")
    .select("track_id, position")
    .eq("release_id", releaseId)
    .order("position", { ascending: true });

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from("release_tracks")
        .update({ position: i + 1 })
        .eq("release_id", releaseId)
        .eq("track_id", remaining[i].track_id);
    }
  }

  revalidatePath(`/artist/releases/${releaseId}`);
}

export async function reorderReleaseTracksAction(
  releaseId: string,
  newOrder: { track_id: string; position: number }[],
) {
  const supabase = await createSupabaseServerClient();

  for (const row of newOrder) {
    await supabase
      .from("release_tracks")
      .update({ position: row.position })
      .eq("release_id", releaseId)
      .eq("track_id", row.track_id);
  }

  revalidatePath(`/artist/releases/${releaseId}`);
}

