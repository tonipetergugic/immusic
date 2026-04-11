import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readFeedbackState } from "@/lib/ai/track-check/read-feedback-state";

export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" } satisfies Err, { status: 401 });
  }

  const url = new URL(request.url);
  const queueId = (url.searchParams.get("queue_id") ?? "").trim();

  if (!queueId) {
    return NextResponse.json({ ok: false, error: "missing_queue_id" } satisfies Err, { status: 400 });
  }

  const result = await readFeedbackState({
    supabase,
    userId: user.id,
    queueId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error } satisfies Err,
      { status: result.status }
    );
  }

  return NextResponse.json(result);
}
