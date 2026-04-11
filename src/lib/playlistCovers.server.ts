/**
 * Server-only helper: builds a public URL for a playlist cover path.
 * Client components must NOT call storage/getPublicUrl.
 */

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function buildPlaylistCoverUrlServer(params: {
  supabase: any;
  cover_preview_path?: string | null | undefined;
  cover_path?: string | null | undefined;
  cover_url?: string | null | undefined;
}): string | null {
  const { supabase, cover_preview_path, cover_path, cover_url } = params;

  const preferredPath = cover_preview_path ?? cover_path ?? null;
  if (preferredPath) {
    const { data } = supabase.storage.from("playlist-covers").getPublicUrl(preferredPath);
    return data?.publicUrl ?? null;
  }

  const raw = cover_url ?? null;
  if (!raw) return null;

  if (isHttpUrl(raw)) {
    return raw;
  }

  const { data } = supabase.storage.from("playlist-covers").getPublicUrl(raw);
  return data?.publicUrl ?? null;
}
