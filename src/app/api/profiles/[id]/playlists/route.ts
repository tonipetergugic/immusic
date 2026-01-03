import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

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
    .select("id, title, description, cover_url, is_public, created_at")
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

  const playlists = (data ?? []).map((pl: any) => {
    const raw = (pl?.cover_url as string | null) ?? null;

    // If stored already as full URL -> keep it
    if (raw && isHttpUrl(raw)) {
      return { ...pl, cover_url: raw };
    }

    // If stored as storage path -> convert to public URL
    if (raw) {
      const publicUrl =
        supabase.storage
          .from("playlist-covers")
          .getPublicUrl(raw).data.publicUrl ?? null;

      return { ...pl, cover_url: publicUrl };
    }

    return { ...pl, cover_url: null };
  });

  return NextResponse.json({ playlists }, { status: 200 });
}
