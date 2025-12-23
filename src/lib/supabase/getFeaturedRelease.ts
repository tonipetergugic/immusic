import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHomeModules } from "@/lib/supabase/getHomeModules";

export type FeaturedRelease = {
  id: string;
  title: string;
  cover_path: string | null;
  cover_url: string | null;
  status: string | null;
  artist_id: string | null;
  artist_name: string | null;
};

export async function getFeaturedRelease(): Promise<FeaturedRelease | null> {
  const { modules, itemsByModuleId } = await getHomeModules();

  const featuredModule = modules.find(
    (m) => m.title === "Featured Release" && m.module_type === "release"
  );
  if (!featuredModule) return null;

  const firstItem = itemsByModuleId.get(featuredModule.id)?.[0];
  if (!firstItem?.item_id) return null;

  const supabase = await createSupabaseServerClient();

  // Release + Artist Display Name
  const { data, error } = await supabase
    .from("releases")
    .select(
      `
      id,
      title,
      cover_path,
      status,
      artist_id,
      profiles:artist_id ( display_name )
    `
    )
    .eq("id", firstItem.item_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let cover_url: string | null = null;

  if (data.cover_path) {
    const { data: publicUrl } = supabase.storage
      .from("release_covers")
      .getPublicUrl(data.cover_path);

    cover_url = publicUrl.publicUrl ?? null;
  }

  return {
    id: data.id,
    title: data.title,
    cover_path: data.cover_path ?? null,
    cover_url,
    status: data.status ?? null,
    artist_id: data.artist_id ?? null,
    artist_name: (data as any).profiles?.display_name ?? null,
  };
}

