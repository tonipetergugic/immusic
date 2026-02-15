import { NextResponse } from "next/server";
import { jsonTerminal } from "@/lib/ai/track-check/http";
import type { LastTerminalItemRow } from "@/lib/ai/track-check/types";
import { hasFeedbackUnlock } from "@/lib/ai/track-check/unlock";
import { writeFeedbackPayloadIfUnlocked } from "@/lib/ai/track-check/payload";

export async function respondFromLastTerminalOrIdle(params: {
  supabase: any;
  admin: any;
  userId: string;
}): Promise<NextResponse> {
  const { data: lastItem, error: lastErr } = await params.supabase
    .from("tracks_ai_queue")
    .select("id, status, audio_hash")
    .eq("user_id", params.userId)
    .in("status", ["approved", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const last = lastItem as LastTerminalItemRow | null;

  if (!lastErr && last) {
    const { id, audio_hash, status } = last;
    const unlocked = await hasFeedbackUnlock(params.supabase, params.userId, id);

    const finalAudioHash = audio_hash;
    if (finalAudioHash) {
      await writeFeedbackPayloadIfUnlocked({
        admin: params.admin,
        userId: params.userId,
        queueId: id,
        audioHash: finalAudioHash,
        decision: status,
        integratedLufs: null,
        truePeakDbTp: null,
        clippedSampleCount: null,
      });
    }

    return jsonTerminal({
      ok: true,
      processed: true,
      decision: status,
      feedback_available: unlocked,
      queue_id: id,
    });
  }

  return NextResponse.json({ ok: true, processed: false, reason: "idle" });
}
