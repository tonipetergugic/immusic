import { NextResponse } from "next/server";
import type { PendingQueueItemRow } from "@/lib/ai/track-check/types";
import { respondFromLastTerminalOrIdle } from "@/lib/ai/track-check/idle-response";

export type QueueFetchResult =
  | { ok: false; response: NextResponse }
  | { ok: true; kind: "pending"; pendingItem: PendingQueueItemRow }
  | { ok: true; kind: "responded"; response: NextResponse };

export async function fetchPendingOrRespond(params: {
  supabase: any;
  admin: any;
  userId: string;
}) : Promise<QueueFetchResult> {
  // 1) Find oldest pending queue item for this user
  const { data: pendingItem, error: fetchErr } = await params.supabase
    .from("tracks_ai_queue")
    .select("id, user_id, audio_path, title, status, hash_status, audio_hash")
    .eq("user_id", params.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 }) };
  }

  if (!pendingItem) {
    const response = await respondFromLastTerminalOrIdle({
      supabase: params.supabase,
      admin: params.admin,
      userId: params.userId,
    });

    return { ok: true, kind: "responded", response };
  }

  return { ok: true, kind: "pending", pendingItem };
}
