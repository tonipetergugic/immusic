import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";

export const dynamic = "force-static";
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam ?? "30"), 1), 100);

    // --- Boost Cooldown (DB-agnostisch, deterministisch) ---
    function fnv1a(str: string) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }

    function dayOfYear(d: Date) {
      const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const diff = d.getTime() - start.getTime();
      return Math.floor(diff / 86400000) + 1;
    }

    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const currentBucket = dayOfYear(now) % 7; // weekly rotation

    const supabase = createSupabasePublicServerClient();

    const baseCount = Math.floor(limit * 0.8);
    const boostCount = limit - baseCount;

    // 1) Base ranking (score_v1)
    const { data: baseItems, error: baseError } = await supabase
      .from("performance_discovery_candidates")
      .select("*")
      .order("score_v1", { ascending: false })
      .order("exposure_completed_at", { ascending: true })
      .order("track_id", { ascending: true })
      .limit(baseCount);

    if (baseError) {
      return NextResponse.json(
        { ok: false, error: baseError.message, items: [] },
        { status: 500 }
      );
    }

    const usedIds = new Set((baseItems ?? []).map((i) => i.track_id));

    // 2) Boost pool
    const { data: boostItems, error: boostError } = await supabase
      .from("performance_discovery_boost_pool")
      .select("*")
      .order("boost_priority", { ascending: false })
      .limit(limit * 2); // overfetch to avoid duplicates

    if (boostError) {
      return NextResponse.json(
        { ok: false, error: boostError.message, items: [] },
        { status: 500 }
      );
    }

    const finalBoostItems = (boostItems ?? [])
      .filter((i) => !usedIds.has(i.track_id))
      // weekly cooldown: only 1/7 of tracks eligible per day (deterministic)
      .filter((i) => (fnv1a(`${i.track_id}:${dayKey}`) % 7) === currentBucket)
      .slice(0, boostCount);

    const baseWithSource = (baseItems ?? []).map((i: any) => ({
      ...i,
      source: "base" as const,
    }));

    const boostWithSource = (finalBoostItems ?? []).map((i: any) => ({
      ...i,
      source: "boost" as const,
      // boost_factor is present only because this comes from performance_discovery_boost_pool
      boost_factor: i.boost_factor ?? null,
    }));

    const items = [...baseWithSource, ...boostWithSource];

    const trackIds = Array.from(
      new Set(items.map((item: any) => item.track_id).filter(Boolean))
    );

    const artistIds = Array.from(
      new Set(items.map((item: any) => item.artist_id).filter(Boolean))
    );

    const [
      { data: tracks, error: tracksError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      trackIds.length
        ? await supabase
            .from("tracks")
            .select("id,bpm,key,genre,audio_path,version,is_explicit")
            .in("id", trackIds)
        : Promise.resolve({ data: [], error: null }),
      artistIds.length
        ? await supabase
            .from("profiles")
            .select("id,display_name")
            .in("id", artistIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const { data: trackArtistsRows, error: trackArtistsError } = trackIds.length
      ? await supabase
          .from("track_artists_resolved")
          .select("track_id, artists")
          .in("track_id", trackIds)
      : { data: [], error: null };

    if (tracksError) {
      return NextResponse.json(
        { ok: false, error: tracksError.message, items: [] },
        { status: 500 }
      );
    }

    if (profilesError) {
      return NextResponse.json(
        { ok: false, error: profilesError.message, items: [] },
        { status: 500 }
      );
    }

    if (trackArtistsError) {
      return NextResponse.json(
        { ok: false, error: trackArtistsError.message, items: [] },
        { status: 500 }
      );
    }

    const trackById = new Map<string, any>(
      (tracks ?? []).map((track: any) => [track.id, track])
    );

    const profileById = new Map<string, any>(
      (profiles ?? []).map((profile: any) => [profile.id, profile])
    );

    const trackArtistsByTrackId = new Map<string, { id: string; display_name: string }[]>();

    for (const row of (trackArtistsRows ?? []) as any[]) {
      const trackId = String(row?.track_id ?? "");
      if (!trackId) continue;

      const artists = Array.isArray(row?.artists)
        ? row.artists
            .map((artist: any) => {
              const artistId = String(artist?.id ?? "");
              if (!artistId) return null;

              return {
                id: artistId,
                display_name: String(artist?.display_name ?? "Unknown Artist"),
              };
            })
            .filter((artist: { id: string; display_name: string } | null): artist is { id: string; display_name: string } => artist !== null)
        : [];

      trackArtistsByTrackId.set(trackId, artists);
    }

    const visibleItems = items.map((item: any) => {
      const track = trackById.get(item.track_id);

      return {
        ...item,
        artist_name: profileById.get(item.artist_id)?.display_name ?? null,
        genre: track?.genre ?? null,
        version: track?.version ?? null,
        is_explicit: track?.is_explicit ?? null,
        audio_path: track?.audio_path ?? null,
        bpm: track?.bpm ?? null,
        key: track?.key ?? null,
        artists: trackArtistsByTrackId.get(String(item.track_id)) ?? [],
      };
    });

    return NextResponse.json(
      {
        ok: true,
        contract_version: "v1",
        mode: "performance",
        slotting: {
          baseCount,
          boostCount,
        },
        items: visibleItems,
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { ok: false, error: msg, items: [] },
      { status: 500 }
    );
  }
}
