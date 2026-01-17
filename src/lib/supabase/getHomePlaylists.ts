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
    .in("id", playlistIds)
    .eq("is_public", true);

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

export async function getLatestHomePlaylistIds(args: { limit: number; excludeIds?: string[] }) {
  const limit = Math.max(0, Math.min(50, args.limit ?? 0));
  const excludeIds = (args.excludeIds ?? []).filter(Boolean);
  if (limit <= 0) return [] as string[];

  const supabase = await createSupabaseServerClient();

  const applyExclude = (q: any) => {
    if (excludeIds.length === 0) return q;
    return q.not("id", "in", `(${excludeIds.join(",")})`);
  };

  const { data, error } = await applyExclude(
    supabase
      .from("playlists")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(limit)
  );

  if (error || !data) return [] as string[];
  return (data as any[]).map((r) => r.id).filter(Boolean);
}

