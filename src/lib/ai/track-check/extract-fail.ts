import { NextResponse } from "next/server";
import { resetQueueToPending } from "@/lib/ai/track-check/queue";

export async function handleExtractFailAndReset(params: {
  supabase: any;
  userId: string;
  queueId: string;
  err: any;
}) {
  // Infra/runtime issue => do NOT reject user audio.
  await resetQueueToPending({ supabase: params.supabase, userId: params.userId, queueId: params.queueId });

  // Keep diagnostics server-side only
  console.error("[AI-CHECK] EBUR128 ERROR message:", params.err?.message || params.err);
  console.error("[AI-CHECK] EBUR128 ERROR code:", params.err?.code);
  console.error("[AI-CHECK] EBUR128 ERROR stderr:\n", String(params.err?.stderr || "").slice(0, 4000));
  console.error("[AI-CHECK] EBUR128 ERROR stdout:\n", String(params.err?.stdout || "").slice(0, 2000));

  return NextResponse.json({ ok: false, error: "ebur128_detect_failed" }, { status: 500 });
}
