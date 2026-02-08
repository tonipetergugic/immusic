import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Decision = "approved" | "rejected";

/**
 * Minimaler Analyzer-Stub (DSP kommt später).
 * IMPORTANT: keinerlei Messwerte/Fail-Codes zurückgeben (Anti-Leak).
 * Für jetzt: immer approved.
 */
async function analyzeAudioStub(_audioPath: string): Promise<Decision> {
  return "approved";
}

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 1) Find oldest pending queue item for this user
  const { data: pendingItem, error: fetchErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, audio_path, title, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 });
  }

  if (!pendingItem) {
    // If there is no pending item, check the most recent terminal state (approved/rejected)
    const { data: lastItem, error: lastErr } = await supabase
      .from("tracks_ai_queue")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["approved", "rejected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastErr && lastItem?.status === "approved") {
      return NextResponse.json({ ok: true, processed: true, decision: "approved", feedback_available: true, queue_id: lastItem.id });
    }

    if (!lastErr && lastItem?.status === "rejected") {
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", queue_id: lastItem.id });
    }

    return NextResponse.json({ ok: true, processed: false, reason: "no_pending" });
  }

  // 2) Claim atomically-ish: pending -> processing (avoid double-processing)
  const { data: claimRows, error: claimErr } = await supabase
    .from("tracks_ai_queue")
    .update({ status: "processing" })
    .eq("id", pendingItem.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id")
    .limit(1);

  if (claimErr) {
    return NextResponse.json({ ok: false, error: "queue_claim_failed" }, { status: 500 });
  }

  if (!claimRows || claimRows.length === 0) {
    return NextResponse.json({ ok: true, processed: false, reason: "already_claimed" });
  }

  const queueId = pendingItem.id as string;

  try {
    const audioPath = pendingItem.audio_path as string | null;
    const title = (pendingItem.title as string | null)?.trim() ?? null;

    if (!audioPath) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: true, processed: true, decision: "rejected", queue_id: queueId });
    }

    // 3) Analyze (stub for now)
    const decision = await analyzeAudioStub(audioPath);

    if (decision === "rejected") {
      const { error: storageError } = await supabase.storage
        .from("tracks")
        .remove([audioPath]);

      if (storageError) {
        // Deterministisch aus processing raus, ohne Details
        await supabase
          .from("tracks_ai_queue")
          .update({ status: "pending", message: null })
          .eq("id", queueId)
          .eq("user_id", user.id);

        return NextResponse.json(
          { ok: false, error: "storage_delete_failed" },
          { status: 500 }
        );
      }

      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: true, processed: true, decision: "rejected", queue_id: queueId });
    }

    // APPROVE -> insert track
    if (!title) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json({ ok: true, processed: true, decision: "rejected", queue_id: queueId });
    }

    const { error: trackError } = await supabase.from("tracks").insert({
      artist_id: user.id,
      audio_path: audioPath,
      title,
      status: "approved",
    });

    if (trackError) {
      // Deterministisch aus processing raus, ohne Details
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "pending", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      return NextResponse.json(
        { ok: false, error: "track_insert_failed" },
        { status: 500 }
      );
    }

    await supabase
      .from("tracks_ai_queue")
      .update({ status: "approved", message: null })
      .eq("id", queueId)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, processed: true, decision: "approved", feedback_available: true, queue_id: queueId });
  } catch {
    // Absoluter Safety-Net: niemals in processing hängen bleiben
    await supabase
      .from("tracks_ai_queue")
      .update({ status: "pending", message: null })
      .eq("id", queueId)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: false, error: "worker_unhandled_error" }, { status: 500 });
  }
}
