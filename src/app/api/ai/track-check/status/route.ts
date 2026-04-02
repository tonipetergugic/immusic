import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { jsonTerminal } from "@/lib/ai/track-check/http";
import { writeFeedbackPayloadIfUnlocked } from "@/lib/ai/track-check/payload";
import { recoverStuckProcessingQueueItems } from "@/lib/ai/track-check/queue-recovery";
import { respondUnauthorized } from "@/lib/ai/track-check/respond";
import { hasFeedbackUnlock } from "@/lib/ai/track-check/unlock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QueueStatusRow = {
  id: string;
  status: string;
  audio_hash: string | null;
  reject_reason: "technical" | "duplicate_audio" | null;
};

type PrivateMetricsRow = {
  hard_fail_reasons: unknown[] | null;
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return respondUnauthorized();
  }

  const queueId = new URL(request.url).searchParams.get("queue_id")?.trim() ?? "";

  if (!queueId) {
    return NextResponse.json({ ok: false, error: "missing_queue_id" }, { status: 400 });
  }

  await recoverStuckProcessingQueueItems({
    supabase,
    userId: user.id,
  });

  const { data: queueRow, error: queueErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, status, audio_hash, reject_reason")
    .eq("id", queueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (queueErr) {
    return NextResponse.json({ ok: false, error: "queue_status_fetch_failed" }, { status: 500 });
  }

  const queue = queueRow as QueueStatusRow | null;

  if (!queue) {
    return NextResponse.json({ ok: false, error: "queue_not_found" }, { status: 404 });
  }

  if (queue.status === "pending") {
    return NextResponse.json({
      ok: true,
      processed: false,
      reason: "queued",
      queue_id: queue.id,
    });
  }

  if (queue.status === "processing") {
    return NextResponse.json({
      ok: true,
      processed: false,
      reason: "processing",
      queue_id: queue.id,
    });
  }

  if (queue.status !== "approved" && queue.status !== "rejected") {
    return NextResponse.json({ ok: false, error: "unsupported_queue_status" }, { status: 500 });
  }

  const { data: metricsRow, error: metricsErr } = await admin
    .from("track_ai_private_metrics")
    .select("hard_fail_reasons")
    .eq("queue_id", queue.id)
    .maybeSingle();

  const metrics = metricsRow as PrivateMetricsRow | null;
  const hardFailReasons =
    !metricsErr && Array.isArray(metrics?.hard_fail_reasons)
      ? metrics.hard_fail_reasons
      : [];

  const decisionForPayload = hardFailReasons.length > 0 ? "rejected" : queue.status;

  const unlocked = await hasFeedbackUnlock(supabase, user.id, queue.id);

  if (queue.audio_hash) {
    await writeFeedbackPayloadIfUnlocked({
      admin,
      userId: user.id,
      queueId: queue.id,
      audioHash: queue.audio_hash,
      decision: decisionForPayload,
      integratedLufs: null,
      truePeakDbTp: null,
      clippedSampleCount: null,
    });
  }

  return jsonTerminal({
    ok: true,
    processed: true,
    decision: queue.status,
    feedback_available: unlocked,
    queue_id: queue.id,
    ...(queue.status === "rejected" && queue.reject_reason
      ? { reason: queue.reject_reason }
      : {}),
  });
}

