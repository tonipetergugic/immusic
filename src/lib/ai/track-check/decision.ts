import { markQueueRejected } from "@/lib/ai/track-check/queue";
import { jsonTerminal } from "@/lib/ai/track-check/http";
import { bestEffortRemoveIngestWav } from "@/lib/ai/track-check/cleanup";
import { hasFeedbackUnlock } from "@/lib/ai/track-check/unlock";

export async function hardFailRejectTechnical(params: {
  supabase: any;
  userId: string;
  queueId: string;
  audioPath: string | null;
  hasFeedbackUnlockFn: (supabase: any, userId: string, queueId: string) => Promise<boolean>;
}) {
  await bestEffortRemoveIngestWav({ supabase: params.supabase, audioPath: params.audioPath });

  await markQueueRejected({
    supabase: params.supabase,
    userId: params.userId,
    queueId: params.queueId,
    reject_reason: "technical",
  });

  const unlocked = await params.hasFeedbackUnlockFn(params.supabase, params.userId, params.queueId);

  return jsonTerminal({
    ok: true,
    processed: true,
    decision: "rejected",
    feedback_available: unlocked,
    queue_id: params.queueId,
  });
}

export async function rejectMissingAudioPath(params: {
  supabase: any;
  userId: string;
  queueId: string;
}) {
  await params.supabase
    .from("tracks_ai_queue")
    .update({ status: "rejected", message: null })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);

  const unlocked = await hasFeedbackUnlock(params.supabase, params.userId, params.queueId);

  return jsonTerminal({
    ok: true,
    processed: true,
    decision: "rejected",
    feedback_available: unlocked,
    queue_id: params.queueId,
  });
}

export async function rejectEmptyWavBuffer(params: {
  supabase: any;
  userId: string;
  queueId: string;
}) {
  await markQueueRejected({
    supabase: params.supabase,
    userId: params.userId,
    queueId: params.queueId,
    reject_reason: "technical",
  });

  const unlocked = await hasFeedbackUnlock(
    params.supabase,
    params.userId,
    params.queueId
  );

  return jsonTerminal({
    ok: true,
    processed: true,
    decision: "rejected",
    feedback_available: unlocked,
    queue_id: params.queueId,
  });
}
