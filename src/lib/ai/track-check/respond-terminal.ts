import { NextResponse } from "next/server";
import { jsonTerminal } from "@/lib/ai/track-check/http";
import { hasFeedbackUnlock } from "@/lib/ai/track-check/unlock";
import type { TrackCheckDecision } from "@/lib/ai/track-check/types";

export async function respondTerminal(params: {
  supabase: any;
  userId: string;
  queueId: string;
  decision: TrackCheckDecision;
  reason?: string;
}): Promise<NextResponse> {
  const unlocked = await hasFeedbackUnlock(params.supabase, params.userId, params.queueId);

  return jsonTerminal({
    ok: true,
    processed: true,
    decision: params.decision,
    feedback_available: unlocked,
    queue_id: params.queueId,
    ...(params.reason ? { reason: params.reason } : {}),
  });
}
