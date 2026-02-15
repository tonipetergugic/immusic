import { NextResponse } from "next/server";
import { resetQueueToPending } from "@/lib/ai/track-check/queue";

export function respondQueueDuplicateCheckFailed500(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "queue_duplicate_check_failed" },
    { status: 500 }
  );
}

export async function respondDuplicateCheckFailed500AndReset(params: {
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
    { ok: false, error: "duplicate_check_failed" },
    { status: 500 }
  );
}
