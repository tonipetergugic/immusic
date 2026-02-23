import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

export async function logFeedbackAccessEvent(params: {
  supabase: any;
  userId: string;
  queueId: string;
  unlocked: boolean;
  creditBalance: number;
  errorParam: string;
  apiStatus: string;
}) {
  const { supabase, userId, queueId, unlocked, creditBalance, errorParam, apiStatus } = params;

  // Observability (rein beobachtend, darf niemals den Flow brechen)
  let queueAudioHash: string | null = null;
  try {
    const { data: qh, error: qhErr } = await supabase
      .from("tracks_ai_queue")
      .select("audio_hash")
      .eq("id", queueId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!qhErr) queueAudioHash = (qh as any)?.audio_hash ?? null;
  } catch {
    // ignore
  }

  await logSecurityEvent({
    eventType: unlocked ? "FEEDBACK_ACCESS_GRANTED" : "FEEDBACK_ACCESS_DENIED",
    severity: "INFO",
    actorUserId: userId,
    queueId,
    unlockId: null,
    reason: unlocked ? null : "NO_UNLOCK",
    hashChecked: false,
    queueAudioHash,
    unlockAudioHash: null,
    metadata: {
      source: "UploadFeedbackV3Page",
      api_status: apiStatus,
      credit_balance: creditBalance,
      error_param: errorParam || null,
    },
  });
}
