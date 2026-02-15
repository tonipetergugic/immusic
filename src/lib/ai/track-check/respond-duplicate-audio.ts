import { NextResponse } from "next/server";
import { hasFeedbackUnlock } from "@/lib/ai/track-check/unlock";

export async function respondDuplicateAudioJson(params: {
  supabase: any;
  userId: string;
  queueId: string;
}): Promise<NextResponse> {
  const unlocked = await hasFeedbackUnlock(params.supabase, params.userId, params.queueId);

  return NextResponse.json({
    ok: true,
    processed: true,
    decision: "rejected",
    reason: "duplicate_audio",
    feedback_available: unlocked,
    queue_id: params.queueId,
  });
}
