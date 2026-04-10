import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  track_id?: string;
  trackId?: string;
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

  // ROLE GATE: Only listeners can rate
  const { data: meProfile, error: meProfErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (meProfErr) {
    return err("INTERNAL_ERROR", "Failed to load profile role", 500);
  }

  const myRole = (meProfile as any)?.role as string | null;

  if (myRole !== "listener") {
    return err("NOT_ELIGIBLE", "Only listeners can rate tracks.", 403);
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return err("INVALID_JSON", "Invalid JSON body", 400);
  }

  const stars = body.stars;
  const directTrackId = body.track_id ?? body.trackId;

  if (!directTrackId) {
    return err("MISSING_RELEASE_TRACK_ID", "Missing track_id", 400);
  }
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return err("INVALID_STARS", "stars must be an integer between 1 and 5", 400);
  }

  let trackId: string | null = directTrackId;

  if (!trackId) {
    return err("MISSING_RELEASE_TRACK_ID", "Missing track_id", 400);
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
  // NOTE: Ratings-Window ist aktuell deprecated (wir nutzen nur 30s + can_rate + 1 rating/track)
  // Wir lesen es ggf. noch zu Debug-Zwecken, aber blocken NICHT mehr.
  const windowOpen = Boolean(win?.window_open);
  void windowOpen;

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

  // PHASE 19 Gate 3: Maximal 1 Rating pro User & Track (final, keine Updates)
  const { data: ratedRows, error: ratedErr } = await supabase
    .from("track_ratings")
    .select("id")
    .eq("user_id", user.id)
    .eq("track_id", trackId)
    .limit(1);

  if (ratedErr) {
    return err("INTERNAL_ERROR", "Failed to check existing rating", 500);
  }

  if (ratedRows && ratedRows.length > 0) {
    return err(
      "ALREADY_RATED",
      "You have already rated this track. Ratings are final.",
      409
    );
  }

  // Insert rating (final)
  const { data: insertedRows, error: insertError } = await supabase
    .from("track_ratings")
    .insert({
      track_id: trackId,
      user_id: user.id,
      stars,
    })
  .select("id, track_id, user_id, stars, created_at, updated_at")
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
  const directTrackId =
    searchParams.get("track_id") ?? searchParams.get("trackId");

  let trackId: string | null = null;
  let streamCount = 0;
  let trackStatus: string | null = null;
  let ratingAvg: number | null = null;
  let ratingCount = 0;

  if (!directTrackId) {
    return err("MISSING_RELEASE_TRACK_ID", "Missing track_id", 400);
  }

  const { data: trackRows, error: trackErr } = await supabase
    .from("tracks")
    .select("id, status, rating_avg, rating_count")
    .eq("id", directTrackId)
    .limit(1);

  if (trackErr) {
    return err("INTERNAL_ERROR", "Failed to load track", 500);
  }

  const track = trackRows && trackRows.length > 0 ? trackRows[0] : null;
  if (!track) return err("RELEASE_TRACK_NOT_FOUND", "track not found", 404);

  trackId = String((track as any).id);
  trackStatus = ((track as any).status as string | null) ?? null;
  ratingAvg = ((track as any).rating_avg as number | null) ?? null;
  ratingCount = Number((track as any).rating_count ?? 0);

  let my_stars: number | null = null;
  let window_open: boolean | null = null;
  let can_rate: boolean | null = null;
  let listened_seconds: number | null = null;

  // NOTE: Ratings-Window ist aktuell deprecated (wir nutzen nur 30s + can_rate + 1 rating/track).
  // Damit der Client (TrackRatingInline) nicht blockiert, liefern wir window_open immer true.
  window_open = true;

  if (trackId) {
    const [lifetimeRes, myRatingsRes, meProfileRes, listenStateRes] =
      await Promise.all([
        supabase
          .from("analytics_track_lifetime")
          .select("streams_lifetime")
          .eq("track_id", trackId)
          .limit(1),

        user
          ? supabase
              .from("track_ratings")
              .select("stars")
              .eq("user_id", user.id)
              .eq("track_id", trackId)
              .order("created_at", { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [], error: null }),

        user
          ? supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        user
          ? supabase
              .from("track_listen_state")
              .select("listened_seconds, can_rate")
              .eq("user_id", user.id)
              .eq("track_id", trackId)
              .limit(1)
          : Promise.resolve({ data: [], error: null }),
      ]);

    const { data: lifetimeRows, error: lifetimeErr } = lifetimeRes;

    if (lifetimeErr) {
      return err("INTERNAL_ERROR", "Failed to load track lifetime streams", 500);
    }

    const lifetimeRow =
      lifetimeRows && lifetimeRows.length > 0 ? lifetimeRows[0] : null;
    streamCount = Number((lifetimeRow as any)?.streams_lifetime ?? 0);

    const { data: myRows } = myRatingsRes;
    my_stars =
      myRows && myRows.length > 0 ? (myRows[0]?.stars ?? null) : null;

    const { data: meProfile } = meProfileRes;
    const myRole = (meProfile as any)?.role as string | null;

    const { data: lsRows } = listenStateRes;
    const ls = lsRows && lsRows.length > 0 ? lsRows[0] : null;
    listened_seconds =
      typeof (ls as any)?.listened_seconds === "number"
        ? (ls as any).listened_seconds
        : 0;

    // If not listener -> force can_rate false
    can_rate = user ? (myRole === "listener" ? Boolean((ls as any)?.can_rate) : false) : null;
  }

  return NextResponse.json({
    ok: true,
    summary: {
      track_id: trackId ?? null,
      track_status: trackStatus ?? null,
      rating_avg: ratingAvg,
      rating_count: ratingCount,
      stream_count: streamCount,
    },
    my_stars,
    eligibility: {
      window_open,
      can_rate,
      listened_seconds,
    },
  });
}

