export async function recoverStuckProcessingQueueItems(params: {
  supabase: any;
  userId: string;
}) {
  // Self-healing: reset "processing" rows older than 10 minutes back to "pending"
  await params.supabase
    .from("tracks_ai_queue")
    .update({ status: "pending", message: null })
    .eq("user_id", params.userId)
    .eq("status", "processing")
    .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
}
