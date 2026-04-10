import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";

export const dynamic = "force-static";
export const revalidate = 60;

export async function GET() {
  const supabase = createSupabasePublicServerClient();

  const { data, error } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      bpm,
      key,
      genre,
      artist_id,
      is_explicit,
      artist_profile:profiles!tracks_artist_id_fkey (
        display_name
      )
    `
    )
    .order("title", { ascending: true });

  if (error) {
    console.error("published tracks route error:", error);
    return NextResponse.json({ error: "Failed to load tracks" }, { status: 500 });
  }

  const trackIds = (data ?? []).map((row: any) => row.id).filter(Boolean);

  const { data: releaseTrackRows, error: releaseTrackErr } = trackIds.length
    ? await supabase
        .from("release_tracks")
        .select(
          `
          track_id,
          release_id,
          releases:releases!release_tracks_release_id_fkey(
            id,
            status,
            cover_path,
            cover_preview_path,
            published_at,
            created_at
          )
          `
        )
        .in("track_id", trackIds)
        .eq("releases.status", "published")
    : { data: [], error: null };

  if (releaseTrackErr) {
    console.error("published tracks route release_tracks error:", releaseTrackErr);
    return NextResponse.json({ error: "Failed to load track releases" }, { status: 500 });
  }

  const bestReleaseByTrackId = new Map<
    string,
    {
      id: string;
      cover_path: string | null;
      cover_preview_path: string | null;
      published_at: string | null;
      created_at: string | null;
    }
  >();

  (releaseTrackRows ?? []).forEach((row: any) => {
    const trackId = row?.track_id ? String(row.track_id) : null;
    const rel = Array.isArray(row?.releases) ? row.releases[0] ?? null : row?.releases ?? null;

    if (!trackId || !rel?.id) return;

    const next = {
      id: String(rel.id),
      cover_path: rel.cover_path ? String(rel.cover_path) : null,
      cover_preview_path: rel.cover_preview_path
        ? String(rel.cover_preview_path)
        : null,
      published_at: rel.published_at ? String(rel.published_at) : null,
      created_at: rel.created_at ? String(rel.created_at) : null,
    };

    const prev = bestReleaseByTrackId.get(trackId);

    if (!prev) {
      bestReleaseByTrackId.set(trackId, next);
      return;
    }

    const nextPublished = next.published_at ?? "";
    const prevPublished = prev.published_at ?? "";

    if (nextPublished > prevPublished) {
      bestReleaseByTrackId.set(trackId, next);
      return;
    }

    if (nextPublished < prevPublished) return;

    const nextCreated = next.created_at ?? "";
    const prevCreated = prev.created_at ?? "";

    if (nextCreated > prevCreated) {
      bestReleaseByTrackId.set(trackId, next);
      return;
    }

    if (nextCreated < prevCreated) return;

    if (next.id > prev.id) {
      bestReleaseByTrackId.set(trackId, next);
    }
  });

  const publishedRows = (data ?? []).filter((row: any) =>
    bestReleaseByTrackId.has(String(row?.id ?? ""))
  );

  const rows = publishedRows;

  const tracks =
    rows.map((row: any) => {
      const releaseObj = bestReleaseByTrackId.get(String(row.id)) ?? null;
      const artistObj = Array.isArray(row.artist_profile)
        ? (row.artist_profile[0] ?? null)
        : (row.artist_profile ?? null);

      const preferredCoverPath =
        releaseObj?.cover_preview_path ?? releaseObj?.cover_path ?? null;

      const cover_url =
        preferredCoverPath
          ? supabase.storage
              .from("release_covers")
              .getPublicUrl(preferredCoverPath).data.publicUrl ?? null
          : null;

      return {
        id: row.id,
        title: row.title ?? "Untitled Track",
        bpm: row.bpm ?? null,
        key: row.key ?? null,
        genre: row.genre ?? null,
        artist_id: row.artist_id ?? null,
        artist_name: artistObj?.display_name ?? null,
        cover_url,
        is_explicit: !!row.is_explicit,
      };
    }) ?? [];

  return NextResponse.json({ tracks }, { status: 200 });
}

