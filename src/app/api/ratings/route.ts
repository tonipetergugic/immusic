import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  release_track_id?: string;
  stars?: number;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const releaseTrackId = body.release_track_id;
  const stars = body.stars;

  if (!releaseTrackId) {
    return NextResponse.json({ error: "Missing release_track_id" }, { status: 400 });
  }
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be an integer between 1 and 5" }, { status: 400 });
  }

  // Gate: nur Development Tracks dürfen roh bewertet werden (Phase 1.3)
  // Join: release_tracks -> tracks
  const { data: rtRows, error: rtError } = await supabase
    .from("release_tracks")
    .select("id, track_id, tracks(status)")
    .eq("id", releaseTrackId)
    .limit(1);

  const rt = rtRows && rtRows.length > 0 ? rtRows[0] : null;

  if (rtError) {
    return NextResponse.json({ error: "Failed to load release_track" }, { status: 500 });
  }
  if (!rt) {
    return NextResponse.json({ error: "release_track not found" }, { status: 404 });
  }

  const trackStatus = (rt as any).tracks?.status as string | undefined;
  if (trackStatus !== "development") {
    return NextResponse.json(
      { error: "Ratings are only allowed for development tracks." },
      { status: 403 }
    );
  }

  const trackId = (rt as any).track_id as string | undefined;
  if (!trackId) {
    return NextResponse.json({ error: "release_track missing track_id" }, { status: 500 });
  }

  // PHASE 19 Gate 1: Ratings-Window muss offen sein (Exposure completed + innerhalb 7 Tage + gate noch nicht erreicht)
  const { data: winRows, error: winErr } = await supabase
    .from("ratings_window_tracks")
    .select("track_id, window_open, in_window, window_started_at, window_ends_at, rating_count, gate_reached")
    .eq("track_id", trackId)
    .limit(1);

  if (winErr) {
    return NextResponse.json({ error: "Failed to load ratings window" }, { status: 500 });
  }

  const win = winRows && winRows.length > 0 ? winRows[0] : null;
  const windowOpen = Boolean(win?.window_open);

  if (!windowOpen) {
    return NextResponse.json(
      { error: "Ratings window is not open for this track." },
      { status: 403 }
    );
  }

  // PHASE 19 Gate 2: Qualifiziertes Hören + can_rate
  const { data: lsRows, error: lsErr } = await supabase
    .from("track_listen_state")
    .select("listened_seconds, can_rate")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .limit(1);

  if (lsErr) {
    return NextResponse.json({ error: "Failed to load listen state" }, { status: 500 });
  }

  const ls = lsRows && lsRows.length > 0 ? lsRows[0] : null;
  const listenedSeconds = typeof ls?.listened_seconds === "number" ? ls.listened_seconds : 0;
  const canRate = Boolean(ls?.can_rate);

  if (!canRate || listenedSeconds < 30) {
    return NextResponse.json(
      { error: "Not eligible to rate (requires >=30s listen and can_rate=true)." },
      { status: 403 }
    );
  }

  // PHASE 19 Gate 3: Maximal 1 Rating pro User & Track (no updates)
  const { data: ratedRows, error: ratedErr } = await supabase
    .from("user_track_ratings")
    .select("user_id, track_id")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .limit(1);

  if (ratedErr) {
    return NextResponse.json({ error: "Failed to check existing rating" }, { status: 500 });
  }

  const alreadyRated = ratedRows && ratedRows.length > 0;
  if (alreadyRated) {
    return NextResponse.json(
      { error: "You have already rated this track." },
      { status: 409 }
    );
  }

  // Insert rating (no updates allowed)
  const { data: insertedRows, error: insertError } = await supabase
    .from("track_ratings")
    .insert({
      release_track_id: releaseTrackId,
      user_id: user.id,
      stars,
    })
    .select("id, release_track_id, user_id, stars, created_at, updated_at")
    .limit(1);

  if (insertError) {
    const msg = insertError.message || "Failed to save rating";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const rating = insertedRows && insertedRows.length > 0 ? insertedRows[0] : null;

  return NextResponse.json({ ok: true, rating }, { status: 200 });
}

