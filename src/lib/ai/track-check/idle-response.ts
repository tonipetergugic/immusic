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

    // Source of truth for hard-fail: persisted private metrics
    const { data: mRow, error: mErr } = await params.admin
      .from("track_ai_private_metrics")
      .select("hard_fail_reasons")
      .eq("queue_id", id)
      .maybeSingle();

    const hardFailReasons = !mErr && mRow && Array.isArray((mRow as any).hard_fail_reasons)
      ? ((mRow as any).hard_fail_reasons as any[])
      : [];

    const decisionForPayload =
      hardFailReasons.length > 0 ? "rejected" : status;

    const unlocked = await hasFeedbackUnlock(params.supabase, params.userId, id);

    const finalAudioHash = audio_hash;
    if (finalAudioHash) {
      await writeFeedbackPayloadIfUnlocked({
        admin: params.admin,
        userId: params.userId,
        queueId: id,
        audioHash: finalAudioHash,
        decision: decisionForPayload,
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
