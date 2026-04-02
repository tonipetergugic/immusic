import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QueueRequestBody = {
  audio_path?: unknown;
  title?: unknown;
};

export async function POST(request: Request) {
  let body: QueueRequestBody;

  try {
    body = (await request.json()) as QueueRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const audioPath =
    typeof body.audio_path === "string" ? body.audio_path.trim() : "";
  const title =
    typeof body.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json(
      { ok: false, error: "Title is required." },
      { status: 400 }
    );
  }

  if (!audioPath) {
    return NextResponse.json(
      { ok: false, error: "No audio file uploaded." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (!audioPath.startsWith(`${user.id}/`)) {
    return NextResponse.json(
      { ok: false, error: "Invalid audio path." },
      { status: 400 }
    );
  }

  const { data: existingPending, error: pendingErr } = await supabase
    .from("tracks_ai_queue")
    .select("id")
    .eq("user_id", user.id)
    .eq("audio_path", audioPath)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (pendingErr) {
    return NextResponse.json(
      { ok: false, error: `Failed to verify queue state: ${pendingErr.message}` },
      { status: 500 }
    );
  }

  const existingQueueId = existingPending?.[0]?.id;
  if (typeof existingQueueId === "string" && existingQueueId.length > 0) {
    return NextResponse.json({
      ok: true,
      queue_id: existingQueueId,
    });
  }

  const { data: insertedRow, error: insertErr } = await supabase
    .from("tracks_ai_queue")
    .insert({
      user_id: user.id,
      audio_path: audioPath,
      title,
      status: "pending",
      hash_status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !insertedRow?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to queue track: ${insertErr?.message ?? "unknown insert error"}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    queue_id: insertedRow.id,
  });
}
