import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toPlayerTrackList } from "@/lib/playerTrack";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing playlist id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("playlist_tracks")
    .select(
      `
      position,
      tracks:track_id (
        id,
        title,
        artist_id,
        audio_path,
        bpm,
        key,
        releases:release_id (
          id,
          cover_path,
          status
        ),
        profiles:artist_id (
          display_name
        )
      )
    `
    )
    .eq("playlist_id", id)
    .order("position", { ascending: true });

  if (error) {
    console.error("queue route error:", error);
    return NextResponse.json({ error: "Failed to load playlist queue" }, { status: 500 });
  }

  const rows = (data ?? []) as any[];
  const rawTracks = rows.map((r) => r.tracks).filter(Boolean);

  const normalizedTracks = rawTracks.map((t: any) => {
    const releaseObj = Array.isArray(t?.releases) ? (t.releases[0] ?? null) : (t?.releases ?? null);
    const profileObj = Array.isArray(t?.profiles) ? (t.profiles[0] ?? null) : (t?.profiles ?? null);

    const cover_url =
      releaseObj?.cover_path
        ? supabase.storage
            .from("release_covers")
            .getPublicUrl(releaseObj.cover_path).data.publicUrl ?? null
        : null;

    const audio_url =
      t?.audio_path
        ? supabase.storage
            .from("tracks")
            .getPublicUrl(t.audio_path).data.publicUrl
        : null;

    if (!audio_url) {
      throw new Error(`Playlist queue route: missing audio_url for track ${t?.id}`);
    }

    return {
      id: t.id,
      title: t.title ?? null,
      artist_id: t.artist_id ?? null,
      audio_url,
      cover_url,
      bpm: t.bpm ?? null,
      key: t.key ?? null,
      profiles: profileObj,
    };
  });

  const queue = toPlayerTrackList(normalizedTracks);

  return NextResponse.json({ queue }, { status: 200 });
}

