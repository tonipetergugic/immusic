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
    return NextResponse.json({ error: "Missing release id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("release_tracks")
    .select(
      `
      position,
      track_title,
      tracks:tracks!release_tracks_track_id_fkey (
        id,
        title,
        artist_id,
        audio_path,
        bpm,
        key,
        profiles:artist_id (
          display_name
        )
      ),
      releases:releases!release_tracks_release_id_fkey (
        id,
        cover_path,
        status
      )
    `
    )
    .eq("release_id", id)
    .eq("releases.status", "published")
    .order("position", { ascending: true });

  if (error) {
    console.error("release queue route error:", error);
    return NextResponse.json({ error: "Failed to load release queue" }, { status: 500 });
  }

  const rows = (data ?? []) as any[];

  const normalized = rows
    .map((rt: any) => {
      const t = rt.tracks;
      if (!t?.id) return null;

      const releaseObj = Array.isArray(rt?.releases)
        ? (rt.releases[0] ?? null)
        : (rt?.releases ?? null);

      const profileObj = Array.isArray(t?.profiles)
        ? (t.profiles[0] ?? null)
        : (t?.profiles ?? null);

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
        throw new Error(`Release queue route: missing audio_url for track ${t.id}`);
      }

      return {
        id: t.id,
        title: rt.track_title ?? t.title ?? "Untitled Track",
        artist_id: t.artist_id ?? "",
        audio_url,
        cover_url,
        bpm: t.bpm ?? null,
        key: t.key ?? null,
        profiles: profileObj,
      };
    })
    .filter(Boolean);

  const queue = toPlayerTrackList(normalized as any[]);

  return NextResponse.json({ queue }, { status: 200 });
}

