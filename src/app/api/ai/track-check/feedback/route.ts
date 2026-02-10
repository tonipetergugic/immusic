import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OkLocked = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  feedback_state: "locked";
  status: "locked";
  unlocked: false;
  payload: null;
};

type OkUnlockedPending = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  feedback_state: "unlocked_pending";
  status: "unlocked_no_data";
  unlocked: true;
  payload: null;
};

type OkUnlockedReady = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  feedback_state: "unlocked_ready";
  status: "unlocked_ready";
  unlocked: true;
  payload: any; // jsonb payload aus DB (später typisieren)
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
    .select("id, user_id, title, audio_hash")
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
    .select("id, audio_hash")
    .eq("queue_id", queueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (unlockErr) {
    return NextResponse.json({ ok: false, error: "unlock_fetch_failed" } satisfies Err, { status: 500 });
  }

  const queueHash = (queueRow as any)?.audio_hash as string | null;
  const unlockHash = (unlockRow as any)?.audio_hash as string | null;

  // Unlock gilt nur, wenn er zur exakt gleichen Audiodatei gehört.
  const unlocked = !!unlockRow?.id && !!queueHash && !!unlockHash && queueHash === unlockHash;

  if (!unlocked) {
    return NextResponse.json(
      {
        ok: true,
        queue_id: queueId,
        queue_title: (queueRow.title as string | null) ?? null,
        feedback_state: "locked",
        status: "locked",
        unlocked: false,
        payload: null,
      } satisfies OkLocked,
      { status: 200 }
    );
  }

  // If unlocked, check whether payload exists and matches the exact audio hash.
  if (queueHash) {
    const { data: payloadRow, error: payloadErr } = await supabase
      .from("track_ai_feedback_payloads")
      .select("audio_hash, payload")
      .eq("queue_id", queueId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!payloadErr && payloadRow) {
      const payloadHash = (payloadRow as any)?.audio_hash as string | null;
      if (payloadHash && payloadHash === queueHash) {
        return NextResponse.json({
          ok: true,
          queue_id: queueId,
          queue_title: ((queueRow as any).title as string | null) ?? null,
          feedback_state: "unlocked_ready",
          status: "unlocked_ready",
          unlocked: true,
          payload: (payloadRow as any).payload ?? null,
        } satisfies OkUnlockedReady);
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      queue_id: queueId,
      queue_title: (queueRow.title as string | null) ?? null,
      feedback_state: "unlocked_pending",
      status: "unlocked_no_data",
      unlocked: true,
      payload: null,
    } satisfies OkUnlockedPending,
    { status: 200 }
  );
}
