export async function markQueueRejected(params: {
  supabase: any;
  userId: string;
  queueId: string;
  reject_reason: "technical" | "duplicate_audio";
}) {
  await params.supabase
    .from("tracks_ai_queue")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      reject_reason: params.reject_reason,
      message: null,
    })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);
}

export async function markQueueApproved(params: {
  supabase: any;
  userId: string;
  queueId: string;
  audio_path: string;
}) {
  await params.supabase
    .from("tracks_ai_queue")
    .update({ status: "approved", message: null, audio_path: params.audio_path })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);
}

export async function resetQueueToPending(params: {
  supabase: any;
  userId: string;
  queueId: string;
}) {
  await params.supabase
    .from("tracks_ai_queue")
    .update({ status: "pending", message: null })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);
}
