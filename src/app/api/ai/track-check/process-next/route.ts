import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  respondAlreadyClaimed,
  respondQueueClaimFailed,
  respondUnauthorized,
} from "@/lib/ai/track-check/respond";
import { recoverStuckProcessingQueueItems } from "@/lib/ai/track-check/queue-recovery";
import { claimPendingQueueItem } from "@/lib/ai/track-check/queue-claim";
import { fetchPendingOrRespond } from "@/lib/ai/track-check/queue-fetch";
import type { PendingQueueItemRow } from "@/lib/ai/track-check/types";
import { runTrackCheckWorker } from "@/lib/ai/track-check/worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return respondUnauthorized();
  }

  let requestedQueueId: string | null = null;

  try {
    const body = await request.json();

    if (body && typeof body.queue_id === "string") {
      const trimmedQueueId = body.queue_id.trim();
      if (trimmedQueueId) {
        requestedQueueId = trimmedQueueId;
      }
    }
  } catch {
    // optional JSON body; ignore empty or invalid body
  }

  // Step 65: Auto-recover stuck processing items (self-healing, user-scoped)
  await recoverStuckProcessingQueueItems({
    supabase,
    userId: user.id,
  });

  const { data: activeProcessingItem, error: activeProcessingErr } = await supabase
    .from("tracks_ai_queue")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "processing")
    .order("processing_started_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (activeProcessingErr) {
    return NextResponse.json({ ok: false, error: "processing_fetch_failed" }, { status: 500 });
  }

  if (activeProcessingItem?.id) {
    return NextResponse.json({
      ok: true,
      processed: false,
      reason: "processing_in_progress",
      queue_id: activeProcessingItem.id,
    });
  }

  let pendingItem: PendingQueueItemRow;

  if (requestedQueueId) {
    const { data: requestedQueueRow, error: requestedQueueErr } = await supabase
      .from("tracks_ai_queue")
      .select("id, user_id, audio_path, title, status, hash_status, audio_hash")
      .eq("id", requestedQueueId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (requestedQueueErr) {
      return NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 });
    }

    const requestedQueue = requestedQueueRow as PendingQueueItemRow | null;

    if (!requestedQueue) {
      return NextResponse.json({ ok: false, error: "queue_not_found" }, { status: 404 });
    }

    if (requestedQueue.status === "processing") {
      return NextResponse.json({
        ok: true,
        processed: false,
        reason: "processing_in_progress",
        queue_id: requestedQueue.id,
      });
    }

    if (requestedQueue.status === "approved" || requestedQueue.status === "rejected") {
      return NextResponse.json({
        ok: true,
        processed: true,
        decision: requestedQueue.status,
        queue_id: requestedQueue.id,
      });
    }

    if (requestedQueue.status !== "pending") {
      return NextResponse.json({ ok: false, error: "unsupported_queue_status" }, { status: 500 });
    }

    pendingItem = requestedQueue;
  } else {
    const fetched = await fetchPendingOrRespond({
      supabase,
      admin,
      userId: user.id,
    });

    if (!fetched.ok) {
      return fetched.response;
    }

    if (fetched.kind === "responded") {
      return fetched.response;
    }

    pendingItem = fetched.pendingItem as PendingQueueItemRow;
  }

  // 2) Claim atomically-ish: pending -> processing (avoid double-processing)
  const claim = await claimPendingQueueItem({
    supabase,
    queueId: pendingItem.id,
    userId: user.id,
  });

  if (!claim.ok) {
    return respondQueueClaimFailed();
  }

  if (!claim.claimed) {
    return respondAlreadyClaimed();
  }

  return await runTrackCheckWorker({
    supabase,
    admin,
    user,
    pendingItem,
  });
}
