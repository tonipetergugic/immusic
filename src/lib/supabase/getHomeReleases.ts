import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HomeReleaseCard = {
  id: string;
  title: string;
  cover_url: string | null;
  artist_id: string | null;
  artist_name: string | null;
  release_type: string | null;
};

export async function getHomeReleases(releaseIds: string[]) {
  if (releaseIds.length === 0) return {} as Record<string, HomeReleaseCard>;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("releases")
    .select("id,title,cover_path,artist_id,release_type,profiles:artist_id(display_name)")
    .in("id", releaseIds);

  if (error || !data) return {} as Record<string, HomeReleaseCard>;

  const byId: Record<string, HomeReleaseCard> = {};

  for (const rel of data as any[]) {
    let cover_url: string | null = null;

    if (rel.cover_path) {
      const { data: pub } = supabase.storage
        .from("release_covers")
        .getPublicUrl(rel.cover_path);
      cover_url = pub?.publicUrl ?? null;
    }

    byId[rel.id] = {
      id: rel.id,
      title: rel.title ?? "Untitled",
      cover_url,
      artist_id: rel.artist_id ?? null,
      artist_name: rel.profiles?.display_name ?? null,
      release_type: rel.release_type ?? null,
    };
  }

  return byId;
}

