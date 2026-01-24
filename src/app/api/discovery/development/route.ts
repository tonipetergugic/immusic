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

  const trackIds = rows.map((r) => r.track_id).filter(Boolean);
  const releaseIds = Array.from(new Set(rows.map((r) => r.release_id).filter(Boolean)));
  const artistIds = Array.from(new Set(rows.map((r) => r.artist_id).filter(Boolean)));

  const debugWarnings: string[] = [];

  // Optional: Metadaten nachladen (wenn Spalten/Tables abweichen, Feed bleibt trotzdem nutzbar)
  const { data: tracks, error: tracksErr } = trackIds.length
    ? await supabase.from("tracks").select("id,title,audio_path,genre,bpm,key,version").in("id", trackIds)
    : { data: [], error: null };

  if (tracksErr) debugWarnings.push(`tracks: ${tracksErr.message}`);

  const { data: releases, error: releasesErr } = releaseIds.length
    ? await supabase.from("releases").select("id,cover_path").in("id", releaseIds)
    : { data: [], error: null };

  if (releasesErr) debugWarnings.push(`releases: ${releasesErr.message}`);

  const { data: profiles, error: profilesErr } = artistIds.length
    ? await supabase.from("profiles").select("id,display_name").in("id", artistIds)
    : { data: [], error: null };

  if (profilesErr) debugWarnings.push(`profiles: ${profilesErr.message}`);

  const { data: collabs, error: collabsErr } = trackIds.length
    ? await supabase
        .from("track_collaborators")
        .select("track_id, profiles:profile_id ( id, display_name )")
        .in("track_id", trackIds)
    : { data: [], error: null };

  if (collabsErr) debugWarnings.push(`track_collaborators: ${collabsErr.message}`);

  const collabsByTrackId = new Map<string, { id: string; display_name: string }[]>();
  (collabs ?? []).forEach((row: any) => {
    const tid = row?.track_id;
    const p = row?.profiles;
    if (!tid || !p?.id) return;
    const arr = collabsByTrackId.get(tid) ?? [];
    arr.push({ id: String(p.id), display_name: String(p.display_name ?? "Unknown Artist") });
    collabsByTrackId.set(tid, arr);
  });

  // Aggregates + release_track_id nachladen (für Ratings/Streams UI)
  const { data: releaseTracks, error: rtErr } = trackIds.length
    ? await supabase
        .from("release_tracks")
        .select("id, track_id, release_id, rating_avg, rating_count, stream_count")
        .in("track_id", trackIds)
    : { data: [], error: null };

  if (rtErr) debugWarnings.push(`release_tracks: ${rtErr.message}`);

  // Map: (track_id|release_id) -> release_track row (best match)
  const rtByTrackRelease = new Map<string, any>();
  const rtByTrack = new Map<string, any>();

  (releaseTracks ?? []).forEach((rt: any) => {
    if (rt?.track_id) {
      if (rt.release_id) rtByTrackRelease.set(`${rt.track_id}|${rt.release_id}`, rt);
      if (!rtByTrack.has(rt.track_id)) rtByTrack.set(rt.track_id, rt);
    }
  });

  const trackById = new Map<string, any>((tracks ?? []).map((t: any) => [t.id, t]));
  const releaseById = new Map<string, any>((releases ?? []).map((r: any) => [r.id, r]));
  const profileById = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

  // My stars (optional) – keyed by release_track_id
  const releaseTrackIds = (releaseTracks ?? []).map((rt: any) => rt?.id).filter(Boolean);
  const myStarsByReleaseTrackId = new Map<string, number>();

  const { data: myRatings, error: myRatingsErr } = releaseTrackIds.length
    ? await supabase
        .from("track_ratings")
        .select("release_track_id, stars")
        .eq("user_id", user.id)
        .in("release_track_id", releaseTrackIds)
    : { data: [], error: null };

  if (myRatingsErr) debugWarnings.push(`track_ratings: ${myRatingsErr.message}`);

  (myRatings ?? []).forEach((r: any) => {
    if (r?.release_track_id && typeof r.stars === "number") {
      myStarsByReleaseTrackId.set(r.release_track_id, r.stars);
    }
  });

  const items = rows.map((r) => {
    const t = trackById.get(r.track_id);
    const rel = releaseById.get(r.release_id);
    const prof = profileById.get(r.artist_id);

    const rt =
      rtByTrackRelease.get(`${r.track_id}|${r.release_id}`) ??
      rtByTrack.get(r.track_id) ??
      null;

    const releaseTrackId = rt?.id ?? null;

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

    const item: any = {
      track_id: r.track_id,
      release_id: r.release_id,
      artist_id: r.artist_id,

      // For rating/streams UI
      release_track_id: null,
      rating_avg: null,
      rating_count: 0,
      stream_count: 0,
      my_stars: null,

      title: t?.title ?? "",
      artist_name: prof?.display_name ?? null,
      cover_path: rel?.cover_path ?? null,
      audio_path: t?.audio_path ?? "",
      genre: t?.genre ?? null,
      bpm: t?.bpm ?? null,
      key: t?.key ?? null,
      version: t?.version ?? null,

      artists,

      exposure: {
        target_listeners: r.target_listeners,
        delivered_listeners: r.delivered_listeners,
        progress: typeof r.progress === "number" ? r.progress : 0,
        started_at: r.started_at,
        status: r.exposure_status,
      },
    };

    item.release_track_id = releaseTrackId;
    item.rating_avg = rt?.rating_avg ?? null;
    item.rating_count = typeof rt?.rating_count === "number" ? rt.rating_count : 0;
    item.stream_count = typeof rt?.stream_count === "number" ? rt.stream_count : 0;
    item.my_stars = releaseTrackId ? (myStarsByReleaseTrackId.get(releaseTrackId) ?? null) : null;

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
