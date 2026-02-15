import { AI_DEBUG } from "@/lib/ai/track-check/debug";
import { writeFeedbackPayloadIfUnlocked } from "@/lib/ai/track-check/payload";
import type { TrackCheckDecision } from "@/lib/ai/track-check/types";

export async function writeFeedbackIfUnlocked(params: {
  admin: any;
  userId: string;
  queueId: string;
  audioHash: string | null;
  decision: TrackCheckDecision;
  integratedLufs: number;
  truePeakDb: number;
  clippedSampleCount: number;
}): Promise<void> {
  const finalAudioHash = params.audioHash;

  // Source of truth: if hard-fail reasons exist in persisted private metrics, payload must be "rejected"
  const { data: mRow, error: mErr } = await params.admin
    .from("track_ai_private_metrics")
    .select("hard_fail_reasons")
    .eq("queue_id", params.queueId)
    .maybeSingle();

  const hardFailReasons =
    !mErr && mRow && Array.isArray((mRow as any).hard_fail_reasons)
      ? ((mRow as any).hard_fail_reasons as any[])
      : [];

  const decisionForPayload: TrackCheckDecision =
    hardFailReasons.length > 0 ? "rejected" : params.decision;

  if (AI_DEBUG) {
    console.log("[PAYLOAD DEBUG] sending to writeFeedback:", {
      integratedLufs: params.integratedLufs,
      truePeakDb: params.truePeakDb,
      decision: decisionForPayload,
      queueId: params.queueId,
      finalAudioHash,
    });
  }

  if (!finalAudioHash) return;

  await writeFeedbackPayloadIfUnlocked({
    admin: params.admin,
    userId: params.userId,
    queueId: params.queueId,
    audioHash: finalAudioHash,
    decision: decisionForPayload,
    integratedLufs: Number.isFinite(params.integratedLufs) ? params.integratedLufs : null,
    truePeakDbTp: Number.isFinite(params.truePeakDb) ? params.truePeakDb : null,
    clippedSampleCount: Number.isFinite(params.clippedSampleCount) ? params.clippedSampleCount : null,
  });
}
