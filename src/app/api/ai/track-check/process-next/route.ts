import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Decision = "approved" | "rejected";

/**
 * Minimaler Analyzer-Stub (DSP kommt später).
 * IMPORTANT: keinerlei Messwerte/Fail-Codes zurückgeben (Anti-Leak).
 * Für jetzt: immer approved.
 */
async function analyzeAudioStub(
  supabase: any,
  audioPath: string
): Promise<Decision> {
  try {
    const { data, error } = await supabase.storage
      .from("tracks")
      .download(audioPath);

    if (error || !data) return "rejected";

    // Blob size check (0 bytes / absurdly large)
    const size = (data as Blob).size ?? 0;
    if (size <= 0) return "rejected";
    if (size > 200 * 1024 * 1024) return "rejected"; // 200 MB hard safety

    // Minimal format sniffing (hard-fail only if totally broken/unknown)
    const buf = await data.arrayBuffer();
    if (!buf || buf.byteLength <= 0) return "rejected";

    const u8 = new Uint8Array(buf);

    const startsWith = (ascii: string) => {
      if (u8.length < ascii.length) return false;
      for (let i = 0; i < ascii.length; i++) {
        if (u8[i] !== ascii.charCodeAt(i)) return false;
      }
      return true;
    };

    const isWav = u8.length >= 12 && startsWith("RIFF") && String.fromCharCode(...u8.slice(8, 12)) === "WAVE";
    const isFlac = startsWith("fLaC");
    const isOgg = startsWith("OggS");
    const isMp3 = startsWith("ID3") || (u8.length >= 2 && u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0); // frame sync
    const isMp4 =
      u8.length >= 12 &&
      u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70; // "ftyp" at offset 4

    if (!(isWav || isFlac || isOgg || isMp3 || isMp4)) return "rejected";

    return "approved";
  } catch {
    return "rejected";
  }
}

async function hasFeedbackUnlock(supabase: any, userId: string, queueId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("track_ai_feedback_unlocks")
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.id;
}
 
type FeedbackPayloadV1 = {
  issues: Array<{
    t?: number; // seconds
    title: string;
    detail?: string;
    severity?: "low" | "medium" | "high";
  }>;
  metrics: Record<string, number | string | null>;
  recommendations: Array<{
    title: string;
    detail?: string;
  }>;
};

async function writeFeedbackPayloadIfUnlocked(params: {
  admin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  queueId: string;
  audioHash: string;
  decision: Decision;
}) {
  const { admin, userId, queueId, audioHash, decision } = params;

  // Only write payload if user has paid unlock (anti-leak + cost control)
  const { data: unlock, error: unlockErr } = await admin
    // Database typing may not include this table yet -> avoid "never" inference
    .from("track_ai_feedback_unlocks" as any)
    .select("id")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .maybeSingle();

  const unlockRow = unlock as { id?: string } | null;

  if (unlockErr || !unlockRow?.id) return;

  const payload: FeedbackPayloadV1 =
    decision === "approved"
      ? {
          issues: [],
          metrics: { decision: "approved" },
          recommendations: [
            {
              title: "No critical technical issues detected (DEV stub).",
              detail:
                "This is a placeholder result. The real DSP analyzer will add timecoded issues, metrics and recommendations.",
            },
          ],
        }
      : {
          issues: [
            {
              title: "Technical listenability problems detected (DEV stub).",
              detail:
                "This is a placeholder result. The real DSP analyzer will provide precise causes and timecodes.",
              severity: "high",
            },
          ],
          metrics: { decision: "rejected" },
          recommendations: [
            {
              title: "Fix technical problems and re-upload.",
              detail:
                "Common issues: corrupted file, silence/dropouts, extreme clipping, invalid format.",
            },
          ],
        };

  // Idempotent: one payload per queue_id (DB has UNIQUE(queue_id))
  const adminClient = admin as any;

  await adminClient
    .from("track_ai_feedback_payloads")
    .upsert(
      {
        queue_id: queueId,
        user_id: userId,
        audio_hash: audioHash,
        payload_version: 1,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "queue_id" }
    );
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdmin();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Step 65: Auto-recover stuck processing items (self-healing, user-scoped)
  // If a previous run crashed after claiming, don't leave the queue blocked forever.
  // We only reset rows older than 10 minutes to avoid interfering with an active run.
  await supabase
    .from("tracks_ai_queue")
    .update({ status: "pending", message: null })
    .eq("user_id", user.id)
    .eq("status", "processing")
    .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  // Self-heal: if a hash exists, hash_status must be "done" (user-scoped)
  await supabase
    .from("tracks_ai_queue")
    .update({ hash_status: "done" })
    .eq("user_id", user.id)
    .eq("status", "pending")
    .not("audio_hash", "is", null)
    .neq("hash_status", "done");

  // 1) Find oldest pending queue item for this user
  const { data: pendingItem, error: fetchErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, audio_path, title, status, hash_status, audio_hash")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .eq("hash_status", "done")
    .not("audio_hash", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: "queue_fetch_failed" }, { status: 500 });
  }

  if (!pendingItem) {
    // If there is a pending item but hash is not ready yet, inform the client to keep waiting.
    const { data: pendingUnhashed, error: unhashedErr } = await supabase
      .from("tracks_ai_queue")
      .select("id, hash_status, audio_hash")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!unhashedErr && pendingUnhashed?.id) {
      const hashStatus = (pendingUnhashed.hash_status as string | null) ?? "pending";
      const hasHash = pendingUnhashed.audio_hash != null;

      if (hashStatus !== "done" || !hasHash) {
        return NextResponse.json({
          ok: true,
          processed: false,
          reason: hashStatus === "error" ? "hash_error" : "waiting_for_hash",
          queue_id: pendingUnhashed.id,
        });
      }
    }

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
      const unlocked = await hasFeedbackUnlock(supabase, user.id, lastItem.id);
      return NextResponse.json({ ok: true, processed: true, decision: "approved", feedback_available: unlocked, queue_id: lastItem.id });
    }

    if (!lastErr && lastItem?.status === "rejected") {
      const unlocked = await hasFeedbackUnlock(supabase, user.id, lastItem.id);
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", feedback_available: unlocked, queue_id: lastItem.id });
    }

    return NextResponse.json({ ok: true, processed: false, reason: "idle" });
  }

  // 2) Claim atomically-ish: pending -> processing (avoid double-processing)
  const { data: claimRows, error: claimErr } = await supabase
    .from("tracks_ai_queue")
    .update({ status: "processing" })
    .eq("id", pendingItem.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .eq("hash_status", "done")
    .not("audio_hash", "is", null)
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

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", feedback_available: unlocked, queue_id: queueId });
    }

    // 3) Analyze (stub for now)
    const decision = await analyzeAudioStub(supabase, audioPath);

    if (decision === "rejected") {
      await supabase
        .from("tracks_ai_queue")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          message: null,
        })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const audioHash = pendingItem.audio_hash as string;
      await writeFeedbackPayloadIfUnlocked({
        admin,
        userId: user.id,
        queueId,
        audioHash,
        decision: "rejected",
      });

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return NextResponse.json({
        ok: true,
        processed: true,
        decision: "rejected",
        feedback_available: unlocked,
        queue_id: queueId,
      });
    }

    // APPROVE -> insert track
    if (!title) {
      await supabase
        .from("tracks_ai_queue")
        .update({ status: "rejected", message: null })
        .eq("id", queueId)
        .eq("user_id", user.id);

      const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
      return NextResponse.json({ ok: true, processed: true, decision: "rejected", feedback_available: unlocked, queue_id: queueId });
    }

    const { error: trackError } = await supabase.from("tracks").insert({
      artist_id: user.id,
      audio_path: audioPath,
      title,
      status: "approved",
      source_queue_id: queueId,
    });

    if (trackError) {
      // Idempotency: track already exists for this queue (unique violation)
      if ((trackError as any).code === "23505") {
        await supabase
          .from("tracks_ai_queue")
          .update({ status: "approved", message: null })
          .eq("id", queueId)
          .eq("user_id", user.id);

        const audioHash = pendingItem.audio_hash as string;
        await writeFeedbackPayloadIfUnlocked({
          admin,
          userId: user.id,
          queueId,
          audioHash,
          decision: "approved",
        });

        const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
        return NextResponse.json({
          ok: true,
          processed: true,
          decision: "approved",
          feedback_available: unlocked,
          queue_id: queueId,
        });
      }

      // Other insert errors are real errors
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

    const audioHash = pendingItem.audio_hash as string;
    await writeFeedbackPayloadIfUnlocked({
      admin,
      userId: user.id,
      queueId,
      audioHash,
      decision: "approved",
    });

    const unlocked = await hasFeedbackUnlock(supabase, user.id, queueId);
    return NextResponse.json({ ok: true, processed: true, decision: "approved", feedback_available: unlocked, queue_id: queueId });
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
