export async function hasFeedbackUnlock(supabase: any, userId: string, queueId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("track_ai_feedback_unlocks")
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.id;
}
