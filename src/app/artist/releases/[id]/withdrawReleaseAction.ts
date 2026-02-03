 "use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function withdrawReleaseAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not authenticated." };
  }

  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("id, artist_id, status, published_at")
    .eq("id", releaseId)
    .eq("artist_id", user.id)
    .maybeSingle();

  if (releaseError || !release) {
    return { error: "Release not found." };
  }

  const isPublished = release.status === "published" || !!release.published_at;
  if (!isPublished) {
    return { error: "Only published releases can be withdrawn." };
  }

  if (release.status === "withdrawn") {
    return { error: "This release is already withdrawn." };
  }

  const { error: updateError } = await supabase
    .from("releases")
    .update({ status: "withdrawn" })
    .eq("id", releaseId)
    .eq("artist_id", user.id);

  if (updateError) {
    return { error: updateError.message ?? "Could not withdraw release." };
  }

  return { ok: true };
}
