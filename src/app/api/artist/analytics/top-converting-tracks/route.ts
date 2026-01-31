import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnalyticsRange = "7d" | "28d" | "all";

function normalizeRange(input: string | null): AnalyticsRange {
  if (input === "7d" || input === "28d" || input === "all") return input;
  return "28d";
}

function normalizeLimit(input: string | null): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return 5;
  const i = Math.floor(n);
  if (i < 1) return 5;
  if (i > 20) return 20;
  return i;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = normalizeRange(url.searchParams.get("range"));
  const limit = normalizeLimit(url.searchParams.get("limit"));

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: `Failed to load profile: ${profileError.message}` },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  if (profile.role !== "artist" && profile.role !== "admin") {
    return NextResponse.json({ error: "Not an artist account." }, { status: 403 });
  }

  const artistId = profile.id;

  // Range -> days filter (same semantics as existing analytics code)
  const days: number | null = range === "7d" ? 7 : range === "28d" ? 28 : null;

  // 1) Load artist tracks (id + title)
  const { data: tracks, error: tracksErr } = await supabase
    .from("tracks")
    .select("id, title")
    .eq("artist_id", artistId);

  if (tracksErr) {
    return NextResponse.json(
      { error: `Failed to load artist tracks: ${tracksErr.message}` },
      { status: 500 }
    );
  }

  const trackRows = (tracks || []).map((t: any) => ({
    track_id: String(t.id),
    title: String(t.title ?? "Unknown track"),
  }));

  if (trackRows.length === 0) {
    return NextResponse.json(
      { data: { range, from: null, items: [] } },
      { status: 200 }
    );
  }

  const trackIds = trackRows.map((t) => t.track_id);
  const titleById = new Map<string, string>(trackRows.map((t) => [t.track_id, t.title]));

  // 2) Unique listeners per track from valid_listen_events within range
  let vq = supabase
    .from("valid_listen_events")
    .select("track_id, user_id")
    .in("track_id", trackIds);

  let fromDate: string | null = null;

  if (days !== null) {
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromISO = from.toISOString().slice(0, 10);
    fromDate = fromISO;
    vq = vq.gte("created_at", `${fromISO}T00:00:00.000Z`);
  }

  const { data: vRows, error: vErr } = await vq;

  if (vErr) {
    return NextResponse.json(
      { error: `Failed to load listen events: ${vErr.message}` },
      { status: 500 }
    );
  }

  const uniqByTrackId = new Map<string, Set<string>>();

  (vRows || []).forEach((r: any) => {
    const tid = r.track_id ? String(r.track_id) : null;
    const uid = r.user_id ? String(r.user_id) : null;
    if (!tid || !uid) return;

    const set = uniqByTrackId.get(tid) ?? new Set<string>();
    set.add(uid);
    uniqByTrackId.set(tid, set);
  });

  // Apply hard rule: only tracks with at least 2 listeners in selected range
  const eligibleTrackIds = trackIds.filter((id) => (uniqByTrackId.get(id)?.size ?? 0) >= 2);

  if (eligibleTrackIds.length === 0) {
    return NextResponse.json(
      { data: { range, from: fromDate, items: [] } },
      { status: 200 }
    );
  }

  // 3) Saves per track from library_tracks (current library state)
  // Only fetch saves for eligible tracks to reduce payload
  const { data: saveRows, error: savesErr } = await supabase
    .from("library_tracks")
    .select("track_id")
    .in("track_id", eligibleTrackIds);

  if (savesErr) {
    return NextResponse.json(
      { error: `Failed to load saves: ${savesErr.message}` },
      { status: 500 }
    );
  }

  const savesByTrackId = new Map<string, number>();

  (saveRows || []).forEach((r: any) => {
    const tid = r.track_id ? String(r.track_id) : null;
    if (!tid) return;
    savesByTrackId.set(tid, (savesByTrackId.get(tid) ?? 0) + 1);
  });

  // 4) Build items + sort by conversion desc
  const itemsAll = eligibleTrackIds.map((track_id) => {
    const listeners = uniqByTrackId.get(track_id)?.size ?? 0;
    const saves = savesByTrackId.get(track_id) ?? 0;
    const conversion_pct = listeners > 0 ? (saves / listeners) * 100 : 0;

    return {
      track_id,
      title: titleById.get(track_id) || "Unknown track",
      listeners,
      saves,
      conversion_pct,
    };
  });

  itemsAll.sort((a, b) => {
    if (b.conversion_pct !== a.conversion_pct) return b.conversion_pct - a.conversion_pct;
    if (b.listeners !== a.listeners) return b.listeners - a.listeners;
    return b.saves - a.saves;
  });

  const response = {
    range,
    from: fromDate,
    items: itemsAll.slice(0, limit),
  };

  return NextResponse.json({ data: response }, { status: 200 });
}
