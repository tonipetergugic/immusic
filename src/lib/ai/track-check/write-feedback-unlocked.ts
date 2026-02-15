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

  if (AI_DEBUG) {
    console.log("[PAYLOAD DEBUG] sending to writeFeedback:", {
      integratedLufs: params.integratedLufs,
      truePeakDb: params.truePeakDb,
      decision: params.decision,
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
    decision: params.decision,
    integratedLufs: Number.isFinite(params.integratedLufs) ? params.integratedLufs : null,
    truePeakDbTp: Number.isFinite(params.truePeakDb) ? params.truePeakDb : null,
    clippedSampleCount: Number.isFinite(params.clippedSampleCount) ? params.clippedSampleCount : null,
  });
}
