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
    ? await supabase.from("tracks").select("id,title,audio_path").in("id", trackIds)
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

  const trackById = new Map<string, any>((tracks ?? []).map((t: any) => [t.id, t]));
  const releaseById = new Map<string, any>((releases ?? []).map((r: any) => [r.id, r]));
  const profileById = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

  const items = rows.map((r) => {
    const t = trackById.get(r.track_id);
    const rel = releaseById.get(r.release_id);
    const prof = profileById.get(r.artist_id);

    const item: any = {
      track_id: r.track_id,
      release_id: r.release_id,
      artist_id: r.artist_id,

      title: t?.title ?? "",
      artist_name: prof?.display_name ?? null,
      cover_path: rel?.cover_path ?? null,
      audio_path: t?.audio_path ?? "",

      exposure: {
        target_listeners: r.target_listeners,
        delivered_listeners: r.delivered_listeners,
        progress: typeof r.progress === "number" ? r.progress : 0,
        started_at: r.started_at,
        status: r.exposure_status,
      },
    };

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

  const response: any = {
    ok: true,
    contract_version: "v1",
    mode: "development",
    slotting: { limit },
    items,
  };

  if (debug) {
    response.debug = {
      limit,
      returned: items.length,
      ordering: ["sort_progress ASC", "sort_started_at ASC", "sort_tiebreaker ASC"],
      warnings: debugWarnings,
    };
  }

  return NextResponse.json(response);
}
