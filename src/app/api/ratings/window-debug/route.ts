import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trackId = url.searchParams.get("track_id");

  if (!trackId) {
    return NextResponse.json({ ok: false, error: "missing_track_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Track status
  const { data: tRows, error: tErr } = await supabase
    .from("tracks")
    .select("id,status")
    .eq("id", trackId)
    .limit(1);

  if (tErr) {
    return NextResponse.json({ ok: false, error: "db_error", details: tErr.message }, { status: 500 });
  }

  const track = tRows && tRows.length > 0 ? tRows[0] : null;

  // Guaranteed exposure row(s) (completed/active) – for diagnostics only
  const { data: geRows, error: geErr } = await supabase
    .from("track_guaranteed_exposure")
    .select("track_id,status,target_listeners,delivered_listeners,started_at,completed_at")
    .eq("track_id", trackId)
    .order("started_at", { ascending: false })
    .limit(10);

  if (geErr) {
    return NextResponse.json({ ok: false, error: "db_error", details: geErr.message }, { status: 500 });
  }

  // Ratings window view (single source of truth)
  const { data: winRows, error: winErr } = await supabase
    .from("ratings_window_tracks")
    .select("track_id,window_open,in_window,window_started_at,window_ends_at,rating_count,gate_reached")
    .eq("track_id", trackId)
    .limit(1);

  if (winErr) {
    return NextResponse.json({ ok: false, error: "db_error", details: winErr.message }, { status: 500 });
  }

  const win = winRows && winRows.length > 0 ? winRows[0] : null;

  const reasons: string[] = [];
  if (!track) reasons.push("track_not_found");
  if (track && track.status !== "development") reasons.push("track_status_not_development");

  const hasCompletedExposure = (geRows ?? []).some((r: any) => r.status === "completed" && r.completed_at);
  if (!hasCompletedExposure) reasons.push("no_completed_exposure");

  if (!win) reasons.push("window_view_no_row");
  if (win && !win.in_window) reasons.push("not_in_window");
  if (win && win.gate_reached) reasons.push("gate_reached");
  if (win && !win.window_open) reasons.push("window_closed");

  return NextResponse.json({
    ok: true,
    contract_version: "v1",
    track_id: trackId,
    track: track ? { id: track.id, status: track.status } : null,
    guaranteed_exposure: geRows ?? [],
    window: win
      ? {
          in_window: Boolean(win.in_window),
          window_open: Boolean(win.window_open),
          started_at: win.window_started_at ?? null,
          ends_at: win.window_ends_at ?? null,
          rating_count: typeof win.rating_count === "number" ? win.rating_count : 0,
          gate_reached: Boolean(win.gate_reached),
        }
      : null,
    reasons,
  });
}
