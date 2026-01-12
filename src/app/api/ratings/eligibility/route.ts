import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

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

  // 1) Track-level: Ratings Window
  const { data: winRows, error: winErr } = await supabase
    .from("ratings_window_tracks")
    .select("track_id,window_open,window_started_at,window_ends_at,rating_count,gate_reached,in_window")
    .eq("track_id", trackId)
    .limit(1);

  const win = (winRows && winRows.length > 0) ? winRows[0] : null;

  if (winErr) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: winErr.message },
      { status: 500 }
    );
  }

  const windowOpen = Boolean(win?.window_open);
  const inWindow = Boolean(win?.in_window);
  const ratingCount = typeof win?.rating_count === "number" ? win.rating_count : 0;

  // 2) User-level: listen qualification + can_rate
  const { data: lsRows, error: lsErr } = await supabase
    .from("track_listen_state")
    .select("listened_seconds,can_rate")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .limit(1);

  const ls = (lsRows && lsRows.length > 0) ? lsRows[0] : null;

  if (lsErr) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: lsErr.message },
      { status: 500 }
    );
  }

  const listenedSeconds =
    typeof ls?.listened_seconds === "number" ? ls.listened_seconds : 0;

  const qualifiedListen = listenedSeconds >= 30;
  const canRate = Boolean(ls?.can_rate);

  // 3) Already rated? (fast path via view)
  const { data: ratedRows, error: ratedErr } = await supabase
    .from("user_track_ratings")
    .select("user_id, track_id")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .limit(1);

  if (ratedErr) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: ratedErr.message },
      { status: 500 }
    );
  }

  const alreadyRated = ratedRows && ratedRows.length > 0;

  const mayRate = windowOpen && canRate && qualifiedListen && !alreadyRated;
  const mayNudge = mayRate; // harte "max 1 nudge" Persistenz kommt ggf. in PHASE 19.1

  const reasons: string[] = [];
  if (!inWindow) reasons.push("not_in_window");
  if (!windowOpen && inWindow) reasons.push("window_closed_or_gate_reached");
  if (!qualifiedListen) reasons.push("not_qualified_listen");
  if (!canRate) reasons.push("can_rate_false");
  if (alreadyRated) reasons.push("already_rated");

  return NextResponse.json({
    ok: true,
    contract_version: "v1",
    track_id: trackId,
    window: {
      in_window: inWindow,
      window_open: windowOpen,
      started_at: win?.window_started_at ?? null,
      ends_at: win?.window_ends_at ?? null,
      rating_count: ratingCount,
      gate_reached: Boolean(win?.gate_reached),
    },
    user: {
      listened_seconds: listenedSeconds,
      qualified_listen: qualifiedListen,
      can_rate: canRate,
      already_rated: alreadyRated,
    },
    may_rate: mayRate,
    may_nudge: mayNudge,
    reasons: uniq(reasons),
  });
}
