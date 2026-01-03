import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HomePlaylistCard = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

export async function getHomePlaylists(playlistIds: string[]) {
  if (playlistIds.length === 0) return {} as Record<string, HomePlaylistCard>;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("playlists")
    .select("id,title,description,cover_url")
    .in("id", playlistIds);

  if (error || !data) return {} as Record<string, HomePlaylistCard>;

  const byId: Record<string, HomePlaylistCard> = {};

  for (const p of data as any[]) {
    const cover_url =
      p?.cover_url
        ? supabase.storage
            .from("playlist-covers")
            .getPublicUrl(p.cover_url).data.publicUrl ?? null
        : null;

    byId[p.id] = {
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      cover_url,
    };
  }

  return byId;
}

