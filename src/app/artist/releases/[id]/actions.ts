"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateReleaseCoverAction(releaseId: string, newFilePath: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized.");
  }

  const { data: release, error: fetchError } = await supabase
    .from("releases")
    .select("id, status, artist_id, cover_path")
    .eq("id", releaseId)
    .single();

  if (fetchError || !release) {
    throw new Error("Failed to load release.");
  }

  if (!release.artist_id || release.artist_id !== user.id) {
    throw new Error("Forbidden.");
  }

  if (!(release.status === "draft" || release.status === "withdrawn")) {
    throw new Error("Cover can only be changed while the release is draft or withdrawn.");
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized.");
  }

  const { data: release, error: fetchError } = await supabase
    .from("releases")
    .select("id, status, artist_id, cover_path")
    .eq("id", releaseId)
    .single();

  if (fetchError || !release) {
    throw new Error("Failed to load release.");
  }

  if (!release.artist_id || release.artist_id !== user.id) {
    throw new Error("Forbidden.");
  }

  if (!(release.status === "draft" || release.status === "withdrawn")) {
    throw new Error("Cover can only be changed while the release is draft or withdrawn.");
  }

  if (release.cover_path) {
    const { error: removeError } = await supabase.storage
      .from("release_covers")
      .remove([release.cover_path]);

    if (removeError) {
      throw new Error("Failed to remove existing cover.");
    }
  }

  const { error: updateError } = await supabase
    .from("releases")
    .update({ cover_path: null })
    .eq("id", releaseId);

  if (updateError) {
    throw new Error("Failed to update the cover.");
  }

  revalidatePath(`/artist/releases/${releaseId}`);
}

export async function addTrackToReleaseAction(releaseId: string, trackId: string) {
  const supabase = await createSupabaseServerClient();

  // Guard: tracklist changes only allowed in draft + must be owner
  const { data: rel, error: relErr } = await supabase
    .from("releases")
    .select("id, status, artist_id")
    .eq("id", releaseId)
    .maybeSingle();

  if (relErr || !rel) {
    return { error: "Release not found." as const };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated." as const };
  }

  if (rel.artist_id !== user.id) {
    return { error: "Not authorized." as const };
  }

  // IMPORTANT: blocks both published and withdrawn
  if (rel.status !== "draft") {
    return { error: "Tracklist can only be changed while the release is in draft." as const };
  }

  const { data: track } = await supabase
    .from("tracks")
    .select("id, title")
    .eq("id", trackId)
    .single();

  if (!track) {
    return { error: "Track not found." as const };
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
    return { error: "Failed to add track to release." as const };
  }

  revalidatePath(`/artist/releases/${releaseId}`);

  return { ok: true as const };
}

export async function removeTrackFromReleaseAction(releaseId: string, trackId: string) {
  const supabase = await createSupabaseServerClient();

  // Guard: tracklist changes only allowed in draft
  const { data: rel, error: relErr } = await supabase
    .from("releases")
    .select("id, status, artist_id")
    .eq("id", releaseId)
    .maybeSingle();

  if (relErr || !rel) {
    return { error: "Release not found." as const };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated." as const };
  }

  if (rel.artist_id !== user.id) {
    return { error: "Not authorized." as const };
  }

  // IMPORTANT: blocks both published and withdrawn
  if (rel.status !== "draft") {
    return { error: "Tracklist can only be changed while the release is in draft." as const };
  }

  const { error: delErr } = await supabase
    .from("release_tracks")
    .delete()
    .eq("release_id", releaseId)
    .eq("track_id", trackId);

  if (delErr) {
    return { error: "Failed to remove track from release." as const };
  }

  const { data: remaining, error: remainingErr } = await supabase
    .from("release_tracks")
    .select("track_id, position")
    .eq("release_id", releaseId)
    .order("position", { ascending: true });

  if (remainingErr) {
    return { error: "Failed to reorder remaining tracks." as const };
  }

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      const { error: updErr } = await supabase
        .from("release_tracks")
        .update({ position: i + 1 })
        .eq("release_id", releaseId)
        .eq("track_id", remaining[i].track_id);

      if (updErr) {
        return { error: "Failed to update track positions." as const };
      }
    }
  }

  revalidatePath(`/artist/releases/${releaseId}`);
  return { ok: true as const };
}

export async function reorderReleaseTracksAction(
  releaseId: string,
  newOrder: { track_id: string; position: number }[],
) {
  const supabase = await createSupabaseServerClient();

  const { data: rel, error: relErr } = await supabase
    .from("releases")
    .select("id, status, artist_id")
    .eq("id", releaseId)
    .maybeSingle();

  if (relErr || !rel) return { error: "Release not found." as const };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Not authenticated." as const };
  if (rel.artist_id !== user.id) return { error: "Not authorized." as const };

  // IMPORTANT: Reorder allowed ONLY in draft or withdrawn
  if (!(rel.status === "draft" || rel.status === "withdrawn")) {
    return { error: "Tracks can only be reordered while the release is draft or withdrawn." as const };
  }

  for (const row of newOrder) {
    const { error: updErr } = await supabase
      .from("release_tracks")
      .update({ position: row.position })
      .eq("release_id", releaseId)
      .eq("track_id", row.track_id);

    if (updErr) {
      return { error: "Failed to reorder tracks." as const };
    }
  }

  revalidatePath(`/artist/releases/${releaseId}`);
  return { ok: true as const };
}

