import { NextResponse } from "next/server";
import { resetQueueToPending } from "@/lib/ai/track-check/queue";

export async function respondWorkerUnhandledError(params: {
  supabase: any;
  userId: string;
  queueId: string;
}): Promise<NextResponse> {
  await resetQueueToPending({
    supabase: params.supabase,
    userId: params.userId,
    queueId: params.queueId,
  });

  return NextResponse.json(
    { ok: false, error: "worker_unhandled_error" },
    { status: 500 }
  );
}
