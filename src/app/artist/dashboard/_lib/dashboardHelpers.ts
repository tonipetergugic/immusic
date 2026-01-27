import type { SupabaseClient } from "@supabase/supabase-js";

export function formatNumber(value: number) {
  return value.toLocaleString("de-DE");
}

export function getCoverUrl(
  supabase: SupabaseClient,
  coverPath: string | null
) {
  if (!coverPath) return null;
  return supabase.storage
    .from("release_covers")
    .getPublicUrl(coverPath).data.publicUrl;
}
