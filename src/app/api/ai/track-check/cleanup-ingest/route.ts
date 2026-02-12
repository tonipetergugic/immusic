import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Keep this conservative to avoid accidental deletes.
// You can adjust later.
const OLDER_THAN_DAYS = 1;
const BATCH_LIMIT = 50;

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cutoffIso = new Date(Date.now() - OLDER_THAN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Only delete ingest WAVs for TERMINAL queue items older than cutoff.
  // IMPORTANT: We do NOT touch pending/processing to avoid breaking retries.
  const { data: rows, error: fetchErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, audio_path, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["approved", "rejected"])
    .not("audio_path", "is", null)
    .lt("created_at", cutoffIso)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 });
  }

  const paths = (rows || [])
    .map((r: any) => String(r.audio_path || "").trim())
    .filter(Boolean);

  if (paths.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, updated: 0, reason: "nothing_to_delete" });
  }

  // Best-effort remove from ingest bucket
  const { error: rmErr } = await supabase.storage.from("ingest_wavs").remove(paths);
  if (rmErr) {
    return NextResponse.json({ ok: false, error: "storage_remove_failed" }, { status: 500 });
  }

  // Null out audio_path for those queue rows (so UI/ops can see it's gone)
  const ids = (rows || []).map((r: any) => r.id);

  const { error: updErr } = await supabase
    .from("tracks_ai_queue")
    .update({ audio_path: null })
    .in("id", ids)
    .eq("user_id", user.id);

  if (updErr) {
    // Storage is the cost driver. If DB update is blocked (e.g. RLS), we still succeeded in cleanup.
    return NextResponse.json({
      ok: true,
      deleted: paths.length,
      updated: 0,
      warning: "queue_update_failed_after_remove",
    });
  }

  return NextResponse.json({ ok: true, deleted: paths.length, updated: ids.length });
}
