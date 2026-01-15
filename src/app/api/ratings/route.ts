import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  release_track_id?: string;
  releaseTrackId?: string;
  stars?: number;
};

type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_JSON"
  | "MISSING_RELEASE_TRACK_ID"
  | "INVALID_STARS"
  | "RELEASE_TRACK_NOT_FOUND"
  | "RATINGS_NOT_ALLOWED_STATUS"
  | "WINDOW_CLOSED"
  | "NOT_ELIGIBLE"
  | "ALREADY_RATED"
  | "INTERNAL_ERROR";

function err(code: ApiErrorCode, message: string, status: number) {
  // BACK-COMPAT: ok:false + error:string bleibt garantiert
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return err("UNAUTHORIZED", "Unauthorized", 401);
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return err("INVALID_JSON", "Invalid JSON body", 400);
  }

  const releaseTrackId = body.release_track_id ?? body.releaseTrackId;
  const stars = body.stars;

  if (!releaseTrackId) {
    return err("MISSING_RELEASE_TRACK_ID", "Missing release_track_id", 400);
  }
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return err("INVALID_STARS", "stars must be an integer between 1 and 5", 400);
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
    return err("INTERNAL_ERROR", "Failed to load release_track", 500);
  }
  if (!rt) {
    return err("RELEASE_TRACK_NOT_FOUND", "release_track not found", 404);
  }

  const trackStatus = (rt as any).tracks?.status as string | undefined;
  if (trackStatus !== "development") {
    return err("RATINGS_NOT_ALLOWED_STATUS", "Ratings are only allowed for development tracks.", 403);
  }

  const trackId = (rt as any).track_id as string | undefined;
  if (!trackId) {
    return err("INTERNAL_ERROR", "release_track missing track_id", 500);
  }

  // PHASE 19 Gate 1: Ratings-Window muss offen sein (Exposure completed + innerhalb 7 Tage + gate noch nicht erreicht)
  const { data: winRows, error: winErr } = await supabase
    .from("ratings_window_tracks")
    .select("track_id, window_open, in_window, window_started_at, window_ends_at, rating_count, gate_reached")
    .eq("track_id", trackId)
    .limit(1);

  if (winErr) {
    return err("INTERNAL_ERROR", "Failed to load ratings window", 500);
  }

  const win = winRows && winRows.length > 0 ? winRows[0] : null;
  const windowOpen = Boolean(win?.window_open);

  if (!windowOpen) {
    return err("WINDOW_CLOSED", "Ratings window is not open for this track.", 403);
  }

  // PHASE 19 Gate 2: Qualifiziertes Hören + can_rate
  const { data: lsRows, error: lsErr } = await supabase
    .from("track_listen_state")
    .select("listened_seconds, can_rate")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .limit(1);

  if (lsErr) {
    return err("INTERNAL_ERROR", "Failed to load listen state", 500);
  }

  const ls = lsRows && lsRows.length > 0 ? lsRows[0] : null;
  const listenedSeconds = typeof ls?.listened_seconds === "number" ? ls.listened_seconds : 0;
  const canRate = Boolean(ls?.can_rate);

  if (!canRate || listenedSeconds < 30) {
    return err("NOT_ELIGIBLE", "Not eligible to rate (requires >=30s listen and can_rate=true).", 403);
  }

  // PHASE 19 Gate 3: Maximal 1 Rating pro User & Track (no updates)
  const { data: ratedRows, error: ratedErr } = await supabase
    .from("user_track_ratings")
    .select("user_id, track_id")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .limit(1);

  if (ratedErr) {
    return err("INTERNAL_ERROR", "Failed to check existing rating", 500);
  }

  const alreadyRated = ratedRows && ratedRows.length > 0;
  if (alreadyRated) {
    return err("ALREADY_RATED", "You have already rated this track.", 409);
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
    return err("INTERNAL_ERROR", insertError.message || "Failed to save rating", 500);
  }

  const rating = insertedRows && insertedRows.length > 0 ? insertedRows[0] : null;

  return NextResponse.json({ ok: true, rating }, { status: 200 });
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const releaseTrackId =
    searchParams.get("release_track_id") ?? searchParams.get("releaseTrackId");

  if (!releaseTrackId) {
    return err("MISSING_RELEASE_TRACK_ID", "Missing release_track_id", 400);
  }

  const { data: rtRows, error: rtError } = await supabase
    .from("release_tracks")
    .select("id, track_id, rating_avg, rating_count, stream_count, tracks(status)")
    .eq("id", releaseTrackId)
    .limit(1);

  if (rtError) return err("INTERNAL_ERROR", "Failed to load release_track", 500);

  const rt = rtRows && rtRows.length > 0 ? rtRows[0] : null;
  if (!rt) return err("RELEASE_TRACK_NOT_FOUND", "release_track not found", 404);

  const trackId = (rt as any).track_id as string | undefined;
  const trackStatus = (rt as any).tracks?.status as string | undefined;

  let my_stars: number | null = null;
  if (user) {
    const { data: myRows } = await supabase
      .from("track_ratings")
      .select("stars")
      .eq("user_id", user.id)
      .eq("release_track_id", releaseTrackId)
      .order("created_at", { ascending: false })
      .limit(1);

    my_stars = myRows && myRows.length > 0 ? (myRows[0]?.stars ?? null) : null;
  }

  let window_open: boolean | null = null;
  let can_rate: boolean | null = null;
  let listened_seconds: number | null = null;

  if (trackId) {
    const { data: winRows } = await supabase
      .from("ratings_window_tracks")
      .select("window_open")
      .eq("track_id", trackId)
      .limit(1);

    window_open = winRows && winRows.length > 0 ? Boolean(winRows[0]?.window_open) : false;
  }

  if (user && trackId) {
    const { data: lsRows } = await supabase
      .from("track_listen_state")
      .select("listened_seconds, can_rate")
      .eq("user_id", user.id)
      .eq("track_id", trackId)
      .limit(1);

    const ls = lsRows && lsRows.length > 0 ? lsRows[0] : null;
    listened_seconds = typeof (ls as any)?.listened_seconds === "number" ? (ls as any).listened_seconds : 0;
    can_rate = Boolean((ls as any)?.can_rate);
  }

  return NextResponse.json({
    ok: true,
    summary: {
      release_track_id: releaseTrackId,
      track_id: trackId ?? null,
      track_status: trackStatus ?? null,
      rating_avg: (rt as any).rating_avg ?? null,
      rating_count: (rt as any).rating_count ?? 0,
      stream_count: (rt as any).stream_count ?? 0,
    },
    my_stars,
    eligibility: {
      window_open,
      can_rate,
      listened_seconds,
    },
  });
}

