 "use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function toggleReleaseVisibilityAction(releaseId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Not authenticated." };

  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .select("id, artist_id, status, published_at")
    .eq("id", releaseId)
    .eq("artist_id", user.id)
    .maybeSingle();

  if (releaseError || !release) return { error: "Release not found." };
  if (!release.published_at) return { error: "This release was never published." };

  const nextStatus = release.status === "withdrawn" ? "published" : "withdrawn";

  // Only allow toggling between published <-> withdrawn
  if (release.status !== "published" && release.status !== "withdrawn") {
    return { error: "Release status cannot be toggled." };
  }

  const { error: updateError } = await supabase
    .from("releases")
    .update({ status: nextStatus })
    .eq("id", releaseId)
    .eq("artist_id", user.id);

  if (updateError) return { error: updateError.message ?? "Failed to update status." };

  return { ok: true, status: nextStatus };
}
