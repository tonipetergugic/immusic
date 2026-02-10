import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // 1) Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 2) queue_id aus Body
  let queue_id: string | null = null;
  try {
    const body = await req.json();
    queue_id = (body?.queue_id ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!queue_id) {
    return NextResponse.json({ ok: false, error: "missing_queue_id" }, { status: 400 });
  }

  // 3) Ownership + Hash-Status prüfen (ohne Raten)
  const { data: queueRow, error: queueErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, hash_status, audio_hash")
    .eq("id", queue_id)
    .maybeSingle();

  if (queueErr) {
    return NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 });
  }

  if (!queueRow || queueRow.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Allow retry if hashing previously errored, as long as no hash exists yet.
  if (queueRow.audio_hash !== null) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "already_hashed",
      hash_status: queueRow.hash_status,
    });
  }

  if (queueRow.hash_status !== "pending" && queueRow.hash_status !== "error") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "not_hashable_state",
      hash_status: queueRow.hash_status,
    });
  }

  // Normalize state for retry (best-effort)
  await supabase
    .from("tracks_ai_queue")
    .update({ hash_status: "pending" })
    .eq("id", queue_id)
    .eq("user_id", user.id);

  // 4) Edge Function aufrufen (deterministisch, genau 1 Queue)
const { data, error } = await supabase.functions.invoke(
  `ai-hash-collector?queue_id=${encodeURIComponent(queue_id)}`,
  { method: "POST", body: {} }
);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "hash_function_failed", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    invoked: true,
    queue_id,
    function_result: data ?? null,
  });
}
