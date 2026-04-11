import { logSecurityEvent } from "@/lib/security/logSecurityEvent";

export async function logFeedbackAccessEvent(params: {
  userId: string;
  queueId: string;
  unlocked: boolean;
  creditBalance: number;
  errorParam: string;
  apiStatus: string;
  queueAudioHash: string | null;
}) {
  const { userId, queueId, unlocked, creditBalance, errorParam, apiStatus, queueAudioHash } = params;

  // Observability (rein beobachtend, darf niemals den Flow brechen)

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
