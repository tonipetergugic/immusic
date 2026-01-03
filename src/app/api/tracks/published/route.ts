import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      bpm,
      key,
      artist_id,
      releases:releases!tracks_release_id_fkey!inner (
        status,
        cover_path
      ),
      artist_profile:profiles!tracks_artist_id_fkey (
        display_name
      )
    `
    )
    .eq("releases.status", "published")
    .order("title", { ascending: true });

  if (error) {
    console.error("published tracks route error:", error);
    return NextResponse.json({ error: "Failed to load tracks" }, { status: 500 });
  }

  const tracks =
    (data ?? []).map((row: any) => {
      const releaseObj = Array.isArray(row.releases) ? (row.releases[0] ?? null) : (row.releases ?? null);
      const artistObj = Array.isArray(row.artist_profile)
        ? (row.artist_profile[0] ?? null)
        : (row.artist_profile ?? null);

      const cover_url =
        releaseObj?.cover_path
          ? supabase.storage.from("release_covers").getPublicUrl(releaseObj.cover_path).data.publicUrl ?? null
          : null;

      return {
        id: row.id,
        title: row.title ?? "Untitled Track",
        bpm: row.bpm ?? null,
        key: row.key ?? null,
        artist_id: row.artist_id ?? null,
        artist_name: artistObj?.display_name ?? null,
        cover_url,
      };
    }) ?? [];

  return NextResponse.json({ tracks }, { status: 200 });
}

