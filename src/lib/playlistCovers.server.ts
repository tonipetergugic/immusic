/**
 * Server-only helper: builds a public URL for a playlist cover path.
 * Client components must NOT call storage/getPublicUrl.
 */
export function buildPlaylistCoverUrlServer(params: {
  supabase: any;
  cover_path: string | null | undefined;
}): string | null {
  const { supabase, cover_path } = params;
  if (!cover_path) return null;

  const { data } = supabase.storage.from("playlist-covers").getPublicUrl(cover_path);
  return data?.publicUrl ?? null;
}

