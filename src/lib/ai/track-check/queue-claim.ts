export type ClaimQueueResult =
  | { ok: true; claimed: true }
  | { ok: true; claimed: false }
  | { ok: false; error: "queue_claim_failed" };

export async function claimPendingQueueItem(params: {
  supabase: any;
  queueId: string;
  userId: string;
}) : Promise<ClaimQueueResult> {
  const { data: claimRows, error: claimErr } = await params.supabase
    .from("tracks_ai_queue")
    .update({ status: "processing" })
    .eq("id", params.queueId)
    .eq("user_id", params.userId)
    .eq("status", "pending")
    .select("id")
    .limit(1);

  if (claimErr) {
    return { ok: false, error: "queue_claim_failed" };
  }

  if (!claimRows || claimRows.length === 0) {
    return { ok: true, claimed: false };
  }

  return { ok: true, claimed: true };
}
