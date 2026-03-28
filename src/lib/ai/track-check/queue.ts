export async function markQueueRejected(params: {
  supabase: any;
  userId: string;
  queueId: string;
  reject_reason: "technical" | "duplicate_audio";
}) {
  const { error } = await params.supabase
    .from("tracks_ai_queue")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      reject_reason: params.reject_reason,
      message: null,
      processing_started_at: null,
    })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);

  if (error) {
    console.error("QUEUE_REJECT_UPDATE_ERROR", {
      queueId: params.queueId,
      userId: params.userId,
      error,
    });
  }
}

export async function markQueueApproved(params: {
  admin: any;
  userId: string;
  queueId: string;
  audio_path: string;
}) {
  const { error } = await params.admin
    .from("tracks_ai_queue")
    .update({
      status: "approved",
      message: null,
      audio_path: params.audio_path,
      processing_started_at: null,
    })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);

  if (error) {
    console.error("QUEUE_APPROVE_UPDATE_ERROR", {
      queueId: params.queueId,
      userId: params.userId,
      error,
    });
  }
}

export async function resetQueueToPending(params: {
  supabase: any;
  userId: string;
  queueId: string;
}) {
  const { error } = await params.supabase
    .from("tracks_ai_queue")
    .update({
      status: "pending",
      message: null,
      processing_started_at: null,
    })
    .eq("id", params.queueId)
    .eq("user_id", params.userId);

  if (error) {
    console.error("QUEUE_RESET_UPDATE_ERROR", {
      queueId: params.queueId,
      userId: params.userId,
      error,
    });
  }
}
