export async function recoverStuckProcessingQueueItems(params: {
  supabase: any;
  userId: string;
}) {
  const cutoffIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Self-healing: reset only truly stuck processing rows back to pending
  // based on the actual processing start time, not queue creation time.
  await params.supabase
    .from("tracks_ai_queue")
    .update({
      status: "pending",
      message: null,
      processing_started_at: null,
    })
    .eq("user_id", params.userId)
    .eq("status", "processing")
    .not("processing_started_at", "is", null)
    .lt("processing_started_at", cutoffIso);
}
