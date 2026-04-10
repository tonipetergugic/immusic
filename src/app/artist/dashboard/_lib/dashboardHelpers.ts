import type { SupabaseClient } from "@supabase/supabase-js";

export function formatNumber(value: number) {
  return value.toLocaleString("de-DE");
}

export function getCoverUrl(
  supabase: SupabaseClient,
  preferredCoverPath: string | null,
  fallbackCoverPath?: string | null
) {
  const resolvedCoverPath = preferredCoverPath ?? fallbackCoverPath ?? null;
  if (!resolvedCoverPath) return null;

  return supabase.storage
    .from("release_covers")
    .getPublicUrl(resolvedCoverPath).data.publicUrl;
}
