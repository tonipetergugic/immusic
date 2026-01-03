import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toPlayerTrack } from "@/lib/playerTrack";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing track id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      audio_path,
      artist_id,
      bpm,
      key,
      releases:releases!tracks_release_id_fkey(
        id,
        cover_path,
        status
      ),
      artist_profile:profiles!tracks_artist_id_fkey(
        display_name
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("track player route error:", error);
    return NextResponse.json({ error: "Failed to load track" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const releaseObj = Array.isArray((data as any).releases)
    ? ((data as any).releases[0] ?? null)
    : ((data as any).releases ?? null);

  const artistObj = Array.isArray((data as any).artist_profile)
    ? ((data as any).artist_profile[0] ?? null)
    : ((data as any).artist_profile ?? null);

  const cover_url =
    releaseObj?.cover_path
      ? supabase.storage
          .from("release_covers")
          .getPublicUrl(releaseObj.cover_path).data.publicUrl ?? null
      : null;

  const audio_url =
    (data as any)?.audio_path
      ? supabase.storage
          .from("tracks")
          .getPublicUrl((data as any).audio_path).data.publicUrl
      : null;

  if (!audio_url) {
    return NextResponse.json(
      { error: `Missing audio_url for track ${id}` },
      { status: 500 }
    );
  }

  const playerTrack = toPlayerTrack({
    id: data.id,
    title: data.title ?? null,
    artist_id: data.artist_id ?? null,
    audio_url,
    cover_url,
    bpm: data.bpm ?? null,
    key: data.key ?? null,
    artist_profile: artistObj ?? null,
  });

  return NextResponse.json({ playerTrack }, { status: 200 });
}

