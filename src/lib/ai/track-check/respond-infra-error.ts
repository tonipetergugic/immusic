import { NextResponse } from "next/server";
import { resetQueueToPending } from "@/lib/ai/track-check/queue";

export async function respondInfraError500AndReset(params: {
  supabase: any;
  userId: string;
  queueId: string;
  error: string;
}): Promise<NextResponse> {
  await resetQueueToPending({
    supabase: params.supabase,
    userId: params.userId,
    queueId: params.queueId,
  });

  return NextResponse.json({ ok: false, error: params.error }, { status: 500 });
}
