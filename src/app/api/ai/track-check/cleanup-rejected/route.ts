import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 14;
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

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 1) Find cleanup candidates (user-scoped)
  const { data: rows, error: fetchErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, audio_path")
    .eq("user_id", user.id)
    .eq("status", "rejected")
    .not("audio_path", "is", null)
    .lt("rejected_at", cutoff)
    .order("rejected_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "cleanup_fetch_failed" }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, failed: 0, processed: 0 });
  }

  let deleted = 0;
  let failed = 0;

  for (const r of rows) {
    const queueId = r.id as string;
    const audioPath = r.audio_path as string | null;

    if (!audioPath) {
      continue;
    }

    // 2) Try delete from Storage (ingest bucket)
    const { error: delErr } = await supabase.storage.from("ingest_wavs").remove([audioPath]);

    if (delErr) {
      failed += 1;
      continue;
    }

    // 3) Mark DB row as cleaned (keep status=rejected, clear audio_path)
    const { error: updErr } = await supabase
      .from("tracks_ai_queue")
      .update({ audio_path: null })
      .eq("id", queueId)
      .eq("user_id", user.id);

    if (updErr) {
      // We already deleted the file; count as failed so we can re-run and fix DB manually if needed.
      failed += 1;
      continue;
    }

    deleted += 1;
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    deleted,
    failed,
  });
}
