import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const artistId = params.id;
  if (!artistId) {
    return NextResponse.json(
      { ok: false, error: "Missing artist id" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("analytics_artist_top_tracks_30d")
    .select("track_id, streams:streams_30d, unique_listeners:listeners_30d, listened_seconds:listened_seconds_30d, ratings_count:ratings_count_30d, rating_avg:rating_avg_30d")
    .eq("artist_id", artistId)
    .order("streams_30d", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    tracks: data ?? [],
  });
}
