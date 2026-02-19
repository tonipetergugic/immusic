import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { writeFeedbackPayloadIfUnlocked } from "@/lib/ai/track-check/payload";
import { AI_DEBUG } from "@/lib/ai/track-check/debug";

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
  payload_version: number;
  payload: any; // jsonb payload aus DB (später typisieren)
};

type Err = { ok: false; error: string };

type QueueRow = {
  id: string;
  user_id: string;
  title: string | null;
  audio_hash: string | null;
  status: string | null;
};

type UnlockRow = {
  id: string;
  audio_hash: string | null;
};

type FeedbackPayloadRow = {
  audio_hash: string | null;
  payload_version: number | string | null;
  payload?: any;
};

type PrivateMetricsRow = {
  true_peak_overs: Array<any> | null;
};

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
    .select("id, user_id, title, audio_hash, status")
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

  const queueHash = (queueRow as QueueRow).audio_hash;
  const unlockHash = unlockRow ? (unlockRow as UnlockRow).audio_hash : null;

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

  // If unlocked + terminal decision exists, refresh payload only when needed.
  // Needed = private metrics already contain true_peak_overs events but cached payload still has none.
  const terminalStatus = (queueRow as QueueRow).status;

  let prePayloadRow: any = null;
  let prePayloadErr: any = null;
  let didRefresh = false;

  if (queueHash && (terminalStatus === "approved" || terminalStatus === "rejected")) {
    try {
      // Read current payload (cheap) to detect stale cache
      const pre = await supabase
        .from("track_ai_feedback_payloads")
        .select("audio_hash, payload_version, payload")
        .eq("queue_id", queueId)
        .eq("user_id", user.id)
        .maybeSingle();

      prePayloadRow = (pre.data as FeedbackPayloadRow | null) ?? null;
      prePayloadErr = pre.error;

      const payloadHash = prePayloadRow?.audio_hash ?? null;
      const payloadVersion = Number(prePayloadRow?.payload_version ?? 0);

      const payloadOversLen = (() => {
        const arr = (prePayloadRow as any)?.payload?.events?.loudness?.true_peak_overs;
        return Array.isArray(arr) ? arr.length : null;
      })();

      // Read private metrics overs length (source of truth)
      const admin = getSupabaseAdmin();
      const { data: mRow, error: mErr } = await admin
        .from("track_ai_private_metrics")
        .select("true_peak_overs")
        .eq("queue_id", queueId)
        .maybeSingle();

      const mOvers = (mRow as PrivateMetricsRow | null)?.true_peak_overs;
      const metricsOversLen = Array.isArray(mOvers) ? mOvers.length : null;

      // Decide if refresh is needed:
      // - payload is missing or wrong hash OR old payload version OR mismatch: metrics have overs but payload has none
      const needsRefresh =
        !prePayloadErr &&
        queueHash &&
        (
          !prePayloadRow ||
          !payloadHash ||
          payloadHash !== queueHash ||
          payloadVersion < 2 ||
          (typeof metricsOversLen === "number" && metricsOversLen > 0 && payloadOversLen === 0)
        );

      if (!mErr && needsRefresh) {
        await writeFeedbackPayloadIfUnlocked({
          admin,
          userId: user.id,
          queueId,
          audioHash: queueHash,
          decision: terminalStatus,
          integratedLufs: null,
          truePeakDbTp: null,
          clippedSampleCount: null,
        });
        didRefresh = true;
      }
    } catch (e) {
      // best-effort: never break API response
      if (AI_DEBUG) {
        console.log("[AI-CHECK][feedback] best-effort refresh failed", { queueId, err: String(e) });
      }
    }
  }

  // If unlocked, return payload (reuse precheck result if no refresh happened)
  if (queueHash) {
    let payloadRow: any = null;
    let payloadErr: any = null;

    if (!didRefresh && !prePayloadErr && prePayloadRow) {
      payloadRow = prePayloadRow;
      payloadErr = null;
    } else {
      const res = await supabase
        .from("track_ai_feedback_payloads")
        .select("audio_hash, payload_version, payload")
        .eq("queue_id", queueId)
        .eq("user_id", user.id)
        .maybeSingle();

      payloadRow = (res.data as FeedbackPayloadRow | null) ?? null;
      payloadErr = res.error;
    }

    if (!payloadErr && payloadRow) {
      const payloadHash = (payloadRow as FeedbackPayloadRow).audio_hash ?? null;
      if (payloadHash && payloadHash === queueHash) {
        return NextResponse.json({
          ok: true,
          queue_id: queueId,
          queue_title: (queueRow as QueueRow).title ?? null,
          feedback_state: "unlocked_ready",
          status: "unlocked_ready",
          unlocked: true,
          payload_version: Number((payloadRow as FeedbackPayloadRow).payload_version ?? 1),
          payload: (payloadRow as FeedbackPayloadRow).payload ?? null,
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
