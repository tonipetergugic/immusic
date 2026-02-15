import { NextResponse } from "next/server";
import { resetQueueToPending } from "@/lib/ai/track-check/queue";

export async function handlePersistFailAndReset(params: {
  supabase: any;
  userId: string;
  queueId: string;
  persist: { ok: false; error: string };
}) {
  const err = params.persist.error;

  if (
    err === "private_metrics_invalid" ||
    err === "private_metrics_upsert_failed" ||
    err === "private_events_upsert_failed"
  ) {
    await resetQueueToPending({ supabase: params.supabase, userId: params.userId, queueId: params.queueId });
    return NextResponse.json({ ok: false, error: err }, { status: 500 });
  }

  // Unknown persist error: conservative fail-closed (no reject, reset to pending)
  await resetQueueToPending({ supabase: params.supabase, userId: params.userId, queueId: params.queueId });
  return NextResponse.json({ ok: false, error: "private_persist_failed" }, { status: 500 });
}
