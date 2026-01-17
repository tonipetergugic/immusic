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

export async function getLatestHomeReleaseIds(args: {
  limit: number;
  excludeIds?: string[];
}) {
  const limit = Math.max(0, Math.min(50, args.limit ?? 0));
  const excludeIds = (args.excludeIds ?? []).filter(Boolean);

  if (limit <= 0) return [] as string[];

  const supabase = await createSupabaseServerClient();

  // Helper to apply exclusion in a PostgREST-friendly way
  const applyExclude = (q: any) => {
    if (excludeIds.length === 0) return q;
    // PostgREST expects: not.in.(...)
    // UUIDs work without quotes in most setups; keep minimal and consistent.
    return q.not("id", "in", `(${excludeIds.join(",")})`);
  };

  // We don't assume which timestamp column exists.
  // Try common columns in order; if a column doesn't exist, Supabase will error -> we try next.
  const orderCandidates = ["release_date", "published_at", "created_at"] as const;

  for (const col of orderCandidates) {
    const q = applyExclude(
      supabase
        .from("releases")
        .select("id")
        .order(col as any, { ascending: false })
        .limit(limit)
    );

    const { data, error } = await q;

    if (!error && data) {
      return (data as any[]).map((r) => r.id).filter(Boolean);
    }
  }

  // Final fallback: no ordering (still returns something, but may not be "newest")
  const { data: fallback, error: fallbackErr } = await applyExclude(
    supabase.from("releases").select("id").limit(limit)
  );

  if (fallbackErr || !fallback) return [] as string[];
  return (fallback as any[]).map((r) => r.id).filter(Boolean);
}

