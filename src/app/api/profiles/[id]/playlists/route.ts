import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPlaylistCoverUrlServer } from "@/lib/playlistCovers.server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing profile id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user?.id && user.id === id;

  // Public only unless owner
  let query = supabase
    .from("playlists")
    .select("id, title, description, cover_url, cover_path, cover_preview_path, is_public, created_at")
    .eq("created_by", id)
    .order("created_at", { ascending: false });

  if (!isOwner) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("profiles playlists route error:", error);
    return NextResponse.json({ error: "Failed to load playlists" }, { status: 500 });
  }

  const playlists = (data ?? []).map((pl: any) => ({
    ...pl,
    cover_url: buildPlaylistCoverUrlServer({
      supabase,
      cover_preview_path: pl?.cover_preview_path ?? null,
      cover_path: pl?.cover_path ?? null,
      cover_url: pl?.cover_url ?? null,
    }),
  }));

  return NextResponse.json({ playlists }, { status: 200 });
}
