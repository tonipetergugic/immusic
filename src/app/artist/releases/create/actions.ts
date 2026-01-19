"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createReleaseAction(formData: FormData) {
  const title = formData.get("title")?.toString().trim();
  const releaseType = formData.get("release_type")?.toString();

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
      release_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      cover_path: null,
    })
    .select("id")
    .single();

  if (releaseError || !releaseData) {
    throw new Error("Failed to create release.");
  }

  redirect(`/artist/releases/${releaseData.id}`);
}

