import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  track_id: string;
  enabled: boolean;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const trackId = body?.track_id;
  const enabled = body?.enabled;

  if (!trackId || typeof enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  // 1) Track ownership + status check (must be performance)
  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("id, artist_id, status")
    .eq("id", trackId)
    .single();

  if (trackError) {
    return NextResponse.json({ ok: false, error: "track_not_found" }, { status: 404 });
  }

  if (track.artist_id !== user.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (track.status !== "performance") {
    return NextResponse.json(
      { ok: false, error: "invalid_status", status: track.status },
      { status: 400 }
    );
  }

  // 2) Upsert opt-in row
  const { error: upsertError } = await supabase
    .from("artist_track_boost_optin")
    .upsert(
      {
        track_id: trackId,
        artist_id: user.id,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "track_id" }
    );

  if (upsertError) {
    return NextResponse.json({ ok: false, error: "upsert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, track_id: trackId, enabled });
}
