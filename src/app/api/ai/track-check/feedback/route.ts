import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OkLocked = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  status: "locked";
  unlocked: false;
  payload: null;
};

type OkUnlocked = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  status: "unlocked_no_data";
  unlocked: true;
  payload: null; // Stub: später echte Analyse-Daten
};

type Err = { ok: false; error: string };

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" } satisfies Err, { status: 401 });
  }

  const url = new URL(request.url);
  const queueId = (url.searchParams.get("queue_id") ?? "").trim();

  if (!queueId) {
    return NextResponse.json({ ok: false, error: "missing_queue_id" } satisfies Err, { status: 400 });
  }

  // 1) Ownership check: queue item muss dem User gehören
  const { data: queueRow, error: queueErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, title")
    .eq("id", queueId)
    .maybeSingle();

  if (queueErr) {
    return NextResponse.json({ ok: false, error: "queue_fetch_failed" } satisfies Err, { status: 500 });
  }

  // Anti-leak: bei fremder/unknown queue_id -> 404
  if (!queueRow || queueRow.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "not_found" } satisfies Err, { status: 404 });
  }

  // 2) Unlock check: darf nur bei vorhandenem Unlock "unlocked" sein
  const { data: unlockRow, error: unlockErr } = await supabase
    .from("track_ai_feedback_unlocks")
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (unlockErr) {
    return NextResponse.json({ ok: false, error: "unlock_fetch_failed" } satisfies Err, { status: 500 });
  }

  const unlocked = !!unlockRow?.id;

  if (!unlocked) {
    return NextResponse.json(
      {
        ok: true,
        queue_id: queueId,
        queue_title: (queueRow.title as string | null) ?? null,
        status: "locked",
        unlocked: false,
        payload: null,
      } satisfies OkLocked,
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      queue_id: queueId,
      queue_title: (queueRow.title as string | null) ?? null,
      status: "unlocked_no_data",
      unlocked: true,
      payload: null,
    } satisfies OkUnlocked,
    { status: 200 }
  );
}
