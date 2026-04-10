"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateReleaseCoverAction(
  releaseId: string,
  newCoverPath: string,
  newCoverPreviewPath: string
) {
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
    .select("id, status, artist_id, cover_path, cover_preview_path")
    .eq("id", releaseId)
    .single();

  if (fetchError || !release) {
    throw new Error("Failed to load release.");
  }

  if (!release.artist_id || release.artist_id !== user.id) {
    throw new Error("Forbidden.");
  }

  if (release.status !== "draft") {
    throw new Error("Cover can only be changed while the release is draft.");
  }

  const previousPaths = [release.cover_path, release.cover_preview_path].filter(
    (path): path is string => Boolean(path)
  );

  const { data: updatedRelease, error: updateError } = await supabase
    .from("releases")
    .update({
      cover_path: newCoverPath,
      cover_preview_path: newCoverPreviewPath,
    })
    .eq("id", releaseId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error("Failed to update the cover.");
  }

  if (!updatedRelease) {
    throw new Error("Cover can only be changed while the release is draft.");
  }

  const obsoletePaths = previousPaths.filter(
    (path) => path !== newCoverPath && path !== newCoverPreviewPath
  );

  if (obsoletePaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("release_covers")
      .remove(obsoletePaths);

    if (removeError) {
      console.error("Failed to remove obsolete cover files:", removeError);
    }
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
    .select("id, status, artist_id, cover_path, cover_preview_path")
    .eq("id", releaseId)
    .single();

  if (fetchError || !release) {
    throw new Error("Failed to load release.");
  }

  if (!release.artist_id || release.artist_id !== user.id) {
    throw new Error("Forbidden.");
  }

  if (release.status !== "draft") {
    throw new Error("Cover can only be changed while the release is draft.");
  }

  const pathsToRemove = [release.cover_path, release.cover_preview_path].filter(
    (path): path is string => Boolean(path)
  );

  const { data: updatedRelease, error: updateError } = await supabase
    .from("releases")
    .update({
      cover_path: null,
      cover_preview_path: null,
    })
    .eq("id", releaseId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error("Failed to update the cover.");
  }

  if (!updatedRelease) {
    throw new Error("Cover can only be changed while the release is draft.");
  }

  if (pathsToRemove.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("release_covers")
      .remove(pathsToRemove);

    if (removeError) {
      console.error("Failed to remove cover files:", removeError);
    }
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

  // IMPORTANT: blocks published releases
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
    position: nextPosition,
  });

  if (error) {
    const errorText = `${error.message ?? ""} ${error.details ?? ""}`;

    if (error.code === "23505" && errorText.includes("(release_id, track_id)")) {
      return { error: "This track is already in this release." as const };
    }

    if (error.code === "23505" && errorText.includes("(release_id, position)")) {
      return { error: "Failed to add track because the track order changed. Please try again." as const };
    }

    return { error: "Failed to add track to release." as const };
  }

  revalidatePath(`/artist/releases/${releaseId}`);

  return { ok: true as const };
}

export async function removeTrackFromReleaseAction(releaseId: string, trackId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("remove_release_track_atomically", {
    p_release_id: releaseId,
    p_track_id: trackId,
  });

  if (error) {
    return {
      error: error.message || ("Failed to remove track from release." as const),
    };
  }

  if (!data) {
    return {
      error: "Track could not be removed. The release may no longer be editable, or the track may already be missing." as const,
    };
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

  // IMPORTANT: Reorder allowed ONLY in draft
  if (rel.status !== "draft") {
    return { error: "Tracks can only be reordered while the release is in draft." as const };
  }

  const { error: reorderError } = await supabase.rpc(
    "reorder_release_tracks_atomically",
    {
      p_release_id: releaseId,
      p_new_order: newOrder,
    }
  );

  if (reorderError) {
    console.error("Failed to reorder tracks:", reorderError);
    return { error: reorderError.message || "Failed to reorder tracks." as const };
  }

  revalidatePath(`/artist/releases/${releaseId}`);
  return { ok: true as const };
}

