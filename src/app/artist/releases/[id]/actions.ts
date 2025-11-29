"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateReleaseTitleAction(formData: FormData) {
  "use server";

  const releaseId = formData.get("release_id")?.toString();
  const title = formData.get("title")?.toString()?.trim() || "";

  if (!releaseId) {
    throw new Error("Missing release_id");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("releases")
    .update({ title })
    .eq("id", releaseId)
    .eq("user_id", user.id);

  if (error) {
    console.error("UPDATE ERROR:", error);
    throw new Error("Failed to update release title");
  }

  redirect(`/artist/releases/${releaseId}`);
}

export async function updateReleaseCoverAction(formData: FormData) {
  "use server";

  const releaseId = formData.get("release_id")?.toString();
  const coverPath = formData.get("cover_path")?.toString() || null;

  if (!releaseId) {
    throw new Error("Missing release_id");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { error } = await supabase
    .from("releases")
    .update({ cover_path: coverPath })
    .eq("id", releaseId)
    .eq("user_id", user.id);

  if (error) {
    console.error("UPDATE COVER ERROR:", error);
    throw new Error("Failed to update cover");
  }

  redirect(`/artist/releases/${releaseId}`);
}

export async function updateTrackTitleAction(formData: FormData) {
  "use server";

  const trackId = formData.get("track_id")?.toString();
  const title = formData.get("title")?.toString()?.trim() || "";

  if (!trackId) {
    throw new Error("Missing track_id");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { error } = await supabase
    .from("tracks")
    .update({ title })
    .eq("id", trackId)
    .eq("user_id", user.id);

  if (error) {
    console.error("UPDATE TRACK TITLE ERROR:", error);
    throw new Error("Failed to update track title");
  }

  return { success: true };
}

export async function deleteTrackAction(formData: FormData) {
  "use server";

  const trackId = formData.get("track_id")?.toString();

  if (!trackId) {
    throw new Error("Missing track_id");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq("user_id", user.id);

  if (error) {
    console.error("DELETE TRACK ERROR:", error);
    throw new Error("Failed to delete track");
  }

  return { success: true };
}

