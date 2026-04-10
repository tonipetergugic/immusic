import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

type CandidateRow = {
  track_id: string;
  release_id: string;
  artist_id: string;

  target_listeners: number;
  delivered_listeners: number;
  progress: number | null;
  started_at: string | null;
  exposure_status: "active" | "completed" | string;

  sort_progress: number;
  sort_started_at: string;
  sort_tiebreaker: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const debug = sp.get("debug") === "true";

  const limitRaw = sp.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isFinite(n) && n > 0) limit = Math.min(Math.floor(n), MAX_LIMIT);
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: candidates, error: candErr } = await supabase
    .from("development_discovery_candidates")
    .select(
      "track_id,release_id,artist_id,target_listeners,delivered_listeners,progress,started_at,exposure_status,sort_progress,sort_started_at,sort_tiebreaker"
    )
    .order("sort_progress", { ascending: true })
    .order("sort_started_at", { ascending: true })
    .order("sort_tiebreaker", { ascending: true })
    .limit(limit);

  if (candErr) {
    return NextResponse.json(
      { ok: false, error: "db_error", details: candErr.message },
      { status: 500 }
    );
  }

  const rows = (candidates ?? []) as unknown as CandidateRow[];

  const trackIds = Array.from(new Set(rows.map((r) => r.track_id).filter(Boolean)));
  const releaseIds = Array.from(new Set(rows.map((r) => r.release_id).filter(Boolean)));
  const artistIds = Array.from(new Set(rows.map((r) => r.artist_id).filter(Boolean)));

  const debugWarnings: string[] = [];

  // Optional: Metadaten nachladen (wenn Spalten/Tables abweichen, Feed bleibt trotzdem nutzbar)
  const [
    { data: tracks, error: tracksErr },
    { data: releases, error: releasesErr },
    { data: profiles, error: profilesErr },
    { data: collabs, error: collabsErr },
    { data: lifetimeRows, error: lifetimeErr },
  ] = await Promise.all([
    trackIds.length
      ? supabase
          .from("tracks")
          .select("id,title,audio_path,genre,bpm,key,version,is_explicit,rating_avg,rating_count")
          .in("id", trackIds)
      : Promise.resolve({ data: [], error: null }),
    releaseIds.length
      ? supabase
          .from("releases")
          .select("id,cover_path,cover_preview_path")
          .in("id", releaseIds)
      : Promise.resolve({ data: [], error: null }),
    artistIds.length
      ? supabase.from("profiles").select("id,display_name").in("id", artistIds)
      : Promise.resolve({ data: [], error: null }),
    trackIds.length
      ? supabase
          .from("track_collaborators")
          .select("track_id, profiles:profile_id ( id, display_name )")
          .in("track_id", trackIds)
      : Promise.resolve({ data: [], error: null }),
    trackIds.length
      ? supabase
          .from("analytics_track_lifetime")
          .select("track_id, streams_lifetime")
          .in("track_id", trackIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (tracksErr) debugWarnings.push(`tracks: ${tracksErr.message}`);
  if (releasesErr) debugWarnings.push(`releases: ${releasesErr.message}`);
  if (profilesErr) debugWarnings.push(`profiles: ${profilesErr.message}`);
  if (collabsErr) debugWarnings.push(`track_collaborators: ${collabsErr.message}`);
  if (lifetimeErr) debugWarnings.push(`analytics_track_lifetime: ${lifetimeErr.message}`);

  const collabsByTrackId = new Map<string, { id: string; display_name: string }[]>();
  (collabs ?? []).forEach((row: any) => {
    const tid = row?.track_id;
    const p = row?.profiles;
    if (!tid || !p?.id) return;
    const arr = collabsByTrackId.get(tid) ?? [];
    arr.push({ id: String(p.id), display_name: String(p.display_name ?? "Unknown Artist") });
    collabsByTrackId.set(tid, arr);
  });

  // Track-first aggregates are already loaded from tracks; no release_tracks lookup needed here.

  const lifetimeStreamsByTrackId = new Map<string, number>(
    (lifetimeRows ?? []).map((row: any) => [
      String(row.track_id),
      typeof row.streams_lifetime === "number" ? row.streams_lifetime : 0,
    ])
  );

  const trackById = new Map<string, any>((tracks ?? []).map((t: any) => [t.id, t]));
  const releaseById = new Map<string, any>((releases ?? []).map((r: any) => [r.id, r]));
  const profileById = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

  const visibleRows = rows;

  // My stars + eligibility (batched) – keyed by track_id
  const myStarsByTrackId = new Map<string, number>();

  const [
    { data: myRatings, error: myRatingsErr },
    { data: meProfile, error: meProfileErr },
    { data: listenStateRows, error: listenStateErr },
  ] = await Promise.all([
    trackIds.length
      ? supabase
          .from("track_ratings")
          .select("track_id, stars")
          .eq("user_id", user.id)
          .in("track_id", trackIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    trackIds.length
      ? supabase
          .from("track_listen_state")
          .select("track_id, listened_seconds, can_rate")
          .eq("user_id", user.id)
          .in("track_id", trackIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (myRatingsErr) debugWarnings.push(`track_ratings: ${myRatingsErr.message}`);
  if (meProfileErr) debugWarnings.push(`profiles(role): ${meProfileErr.message}`);
  if (listenStateErr) debugWarnings.push(`track_listen_state: ${listenStateErr.message}`);

  (myRatings ?? []).forEach((r: any) => {
    if (r?.track_id && typeof r.stars === "number") {
      myStarsByTrackId.set(r.track_id, r.stars);
    }
  });

  const isListener = (meProfile as any)?.role === "listener";

  const listenStateByTrackId = new Map<
    string,
    { can_rate: boolean | null; listened_seconds: number | null }
  >();

  (listenStateRows ?? []).forEach((row: any) => {
    if (!row?.track_id) return;

    listenStateByTrackId.set(String(row.track_id), {
      can_rate: typeof row.can_rate === "boolean" ? row.can_rate : null,
      listened_seconds:
        typeof row.listened_seconds === "number" ? row.listened_seconds : 0,
    });
  });

  const items = visibleRows.map((r) => {
    const t = trackById.get(r.track_id);
    const rel = releaseById.get(r.release_id);
    const prof = profileById.get(r.artist_id);

    const ownerArtist = r.artist_id
      ? { id: String(r.artist_id), display_name: String(prof?.display_name ?? "Unknown Artist") }
      : null;

    const collabArtists = collabsByTrackId.get(r.track_id) ?? [];

    const artists = Array.from(
      new Map(
        [ownerArtist, ...collabArtists]
          .filter(Boolean)
          .map((a: any) => [a.id, a]),
      ).values(),
    );

    const listenState = listenStateByTrackId.get(String(r.track_id));

    const item: any = {
      track_id: r.track_id,
      release_id: r.release_id,
      artist_id: r.artist_id,

      // Track-first rating/streams UI
      rating_avg: null,
      rating_count: 0,
      stream_count: 0,
      my_stars: null,
      eligibility: {
        window_open: true,
        can_rate: isListener ? (listenState?.can_rate ?? false) : false,
        listened_seconds: isListener ? (listenState?.listened_seconds ?? 0) : 0,
      },

      title: t?.title ?? "",
      artist_name: prof?.display_name ?? null,
      cover_path: rel?.cover_path ?? null,
      cover_preview_path: rel?.cover_preview_path ?? null,
      audio_path: t?.audio_path ?? "",
      genre: t?.genre ?? null,
      bpm: t?.bpm ?? null,
      key: t?.key ?? null,
      version: t?.version ?? null,
      is_explicit: !!t?.is_explicit,

      artists,

      exposure: {
        target_listeners: r.target_listeners,
        delivered_listeners: r.delivered_listeners,
        progress: typeof r.progress === "number" ? r.progress : 0,
        started_at: r.started_at,
        status: r.exposure_status,
      },
    };

    item.rating_avg = t?.rating_avg ?? null;
    item.rating_count = typeof t?.rating_count === "number" ? t.rating_count : 0;
    item.stream_count = lifetimeStreamsByTrackId.get(String(r.track_id)) ?? 0;
    item.my_stars = myStarsByTrackId.get(r.track_id) ?? null;

    if (debug) {
      item.debug_reason = {
        eligible: true,
        reason: "status=development AND exposure_status IN (active, completed)",
        sort_keys: {
          progress: r.sort_progress,
          started_at: r.sort_started_at,
          tiebreaker: r.sort_tiebreaker,
        },
      };
    }

    return item;
  });

  const genreParam = sp.get("genre");

  const filteredItems = !genreParam || genreParam === "all"
    ? items
    : items.filter((it: any) => (it.genre ?? "").toLowerCase() === genreParam.toLowerCase());

  const response: any = {
    ok: true,
    contract_version: "v1",
    mode: "development",
    slotting: { limit },
    items: filteredItems,
  };

  if (debug) {
    response.debug = {
      limit,
      returned: filteredItems.length,
      ordering: ["sort_progress ASC", "sort_started_at ASC", "sort_tiebreaker ASC"],
      warnings: debugWarnings,
    };
  }

  return NextResponse.json(response);
}
