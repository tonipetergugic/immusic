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

  const { data: releaseTrackRows, error: releaseTrackErr } = await supabase
    .from("release_tracks")
    .select(
      `
      release_id,
      releases:releases!release_tracks_release_id_fkey(
        id,
        cover_path,
        status,
        published_at,
        created_at
      )
      `
    )
    .eq("track_id", id)
    .eq("releases.status", "published");

  if (releaseTrackErr) {
    console.error("track player route release_tracks error:", releaseTrackErr);
    return NextResponse.json({ error: "Failed to load track release" }, { status: 500 });
  }

  const bestRelease = ((releaseTrackRows ?? []) as any[]).reduce((best, row) => {
    const rel = Array.isArray(row?.releases) ? row.releases[0] ?? null : row?.releases ?? null;
    if (!rel?.id) return best;

    const next = {
      id: String(rel.id),
      cover_path: rel.cover_path ? String(rel.cover_path) : null,
      status: rel.status ? String(rel.status) : null,
      published_at: rel.published_at ? String(rel.published_at) : null,
      created_at: rel.created_at ? String(rel.created_at) : null,
    };

    if (!best) return next;

    const nextPublished = next.published_at ?? "";
    const bestPublished = best.published_at ?? "";

    if (nextPublished > bestPublished) return next;
    if (nextPublished < bestPublished) return best;

    const nextCreated = next.created_at ?? "";
    const bestCreated = best.created_at ?? "";

    if (nextCreated > bestCreated) return next;
    if (nextCreated < bestCreated) return best;

    if (next.id > best.id) return next;

    return best;
  }, null as null | {
    id: string;
    cover_path: string | null;
    status: string | null;
    published_at: string | null;
    created_at: string | null;
  });

  if (!bestRelease?.id) {
    return NextResponse.json({ error: "Track not available" }, { status: 404 });
  }

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
      genre,
      is_explicit,
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

  const artistObj = Array.isArray((data as any).artist_profile)
    ? ((data as any).artist_profile[0] ?? null)
    : ((data as any).artist_profile ?? null);

  const cover_url =
    bestRelease.cover_path
      ? supabase.storage
          .from("release_covers")
          .getPublicUrl(bestRelease.cover_path).data.publicUrl ?? null
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
    status: "published",
    is_explicit: data.is_explicit ?? false,
    audio_url,
    cover_url,
    bpm: data.bpm ?? null,
    key: data.key ?? null,
    genre: data.genre ?? null,
    artist_profile: artistObj ?? null,
  });

  return NextResponse.json({ playerTrack }, { status: 200 });
}

