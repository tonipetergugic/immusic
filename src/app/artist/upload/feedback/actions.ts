"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildFeedbackPayloadV2Mvp, type FeedbackPayloadV2 } from "@/lib/ai/feedbackPayloadV2";

async function ensureFeedbackPayloadForTerminalQueue(params: {
  queueId: string;
  userId: string;
  audioHash: string;
}) {
  const { queueId, userId, audioHash } = params;
  const admin = getSupabaseAdmin() as any;

  // If payload already exists -> nothing to do (idempotent)
  const { data: existing, error: existingErr } = await admin
    .from("track_ai_feedback_payloads")
    .select("id")
    .eq("queue_id", queueId)
    .maybeSingle();

  if (!existingErr && existing?.id) return;

  // Load queue state (service-role, no RLS issues)
  const { data: q, error: qErr } = await admin
    .from("tracks_ai_queue")
    .select("id, user_id, status, audio_hash")
    .eq("id", queueId)
    .maybeSingle();

  if (qErr || !q) return;
  if (q.user_id !== userId) return;
  if (!q.audio_hash || q.audio_hash !== audioHash) return;

  const status = String(q.status ?? "");
  if (status !== "approved" && status !== "rejected") return;

  const decision = status === "approved" ? "approved" : "rejected";

  const payload: FeedbackPayloadV2 = buildFeedbackPayloadV2Mvp({
    queueId,
    audioHash,
    decision,
    integratedLufs: null,
    truePeakDbTp: null,
  });

  await admin
    .from("track_ai_feedback_payloads")
    .upsert(
      {
        queue_id: queueId,
        user_id: userId,
        audio_hash: audioHash,
        payload_version: 2,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "queue_id" }
    );
}

export async function unlockPaidFeedbackAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const queueId = String(formData.get("queue_id") ?? "").trim();
  if (!queueId) {
    redirect("/artist/upload/feedback?error=missing_queue_id");
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    redirect("/login");
  }

  // 1) Ownership check: queue item muss dem User gehören
  const { data: queueRow, error: queueErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, audio_hash")
    .eq("id", queueId)
    .maybeSingle();

  if (queueErr) {
    throw new Error(`Failed to load queue item: ${queueErr.message}`);
  }
  if (!queueRow || queueRow.user_id !== user.id) {
    redirect("/artist/upload/feedback?error=not_found");
  }

  // Guard: Unlock darf nur erfolgen, wenn audio_hash bereits vorhanden ist
  // (Bindung an exakt die analysierte Audiodatei)
  const queueAudioHash = (queueRow as any)?.audio_hash as string | null;
  if (!queueAudioHash) {
    redirect(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}&error=waiting_for_hash`);
  }

  // 2) Persistenter Unlock pro Queue (idempotent)
  // Versuch zuerst zu inserten: wenn bereits vorhanden, kein Credit-Spend.
  const { data: insertedRows, error: insertErr } = await supabase
    .from("track_ai_feedback_unlocks")
    .insert({ queue_id: queueId, user_id: user.id, audio_hash: queueAudioHash })
    .select("id")
    .limit(1);

  if (insertErr) {
    const msg = (insertErr as any)?.message ?? "";

    // Unique violation -> schon freigeschaltet -> kein Spend
    if (msg.includes("duplicate key") || msg.includes("unique") || msg.includes("23505")) {
      redirect(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`);
    }

    throw new Error(`Failed to persist unlock: ${msg || "unknown_error"}`);
  }

  const unlockId = (insertedRows as any[])?.[0]?.id as string | undefined;
  if (!unlockId) {
    // Should not happen; but avoid silent inconsistencies
    throw new Error("Failed to persist unlock: missing_id");
  }

  // 3) Credits prüfen (optional, aber UX: sauberer Redirect statt RPC-Exception)
  const { data: creditRow, error: creditErr } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (creditErr) {
    // rollback unlock
    await supabase.from("track_ai_feedback_unlocks").delete().eq("id", unlockId).eq("user_id", user.id);
    throw new Error(`Failed to load credits: ${creditErr.message}`);
  }

  const balance = typeof creditRow?.balance === "number" ? creditRow.balance : 0;
  if (balance < 1) {
    // rollback unlock
    await supabase.from("track_ai_feedback_unlocks").delete().eq("id", unlockId).eq("user_id", user.id);
    // Security/Observability (rein beobachtend, darf niemals den Flow brechen)
    await logSecurityEvent({
      eventType: "UNLOCK_DENIED_NO_CREDITS",
      severity: "INFO",
      actorUserId: user.id,
      queueId,
      unlockId,
      reason: "insufficient_credits",
      hashChecked: false,
      queueAudioHash: (queueRow as any)?.audio_hash ?? null,
      unlockAudioHash: null,
      metadata: { source: "unlockPaidFeedbackAction", credit_balance: balance },
    });

    redirect(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}&error=insufficient_credits`);
  }

  if (!creditRow || (typeof creditRow.balance === "number" ? creditRow.balance : 0) <= 0) {
    throw new Error("Insufficient credits.");
  }

  // 4) Credit spend
  const { error: spendErr } = await supabase.rpc("credit_spend", {
    p_profile_id: user.id,
    p_amount: 1,
    p_reason: "paid_feedback_unlock",
    p_source: "upload_feedback",
    p_created_by: user.id,
  });

  if (spendErr) {
    // rollback unlock (keine Freischaltung ohne Zahlung)
    await supabase
      .from("track_ai_feedback_unlocks")
      .delete()
      .eq("id", unlockId)
      .eq("user_id", user.id);

    const msg = (spendErr as any)?.message ?? "";

    // UX: wenn Credit spend wegen fehlendem Guthaben scheitert (Race/Edge), sauber redirecten
    const lower = msg.toLowerCase();
    if (lower.includes("insufficient") || lower.includes("not enough") || lower.includes("balance")) {
      // Security/Observability (rein beobachtend, darf niemals den Flow brechen)
      await logSecurityEvent({
        eventType: "UNLOCK_DENIED_NO_CREDITS",
        severity: "INFO",
        actorUserId: user.id,
        queueId,
        unlockId,
        reason: "insufficient_credits",
        hashChecked: false,
        queueAudioHash: (queueRow as any)?.audio_hash ?? null,
        unlockAudioHash: null,
        metadata: { source: "unlockPaidFeedbackAction", path: "credit_spend", spend_error: msg },
      });

      redirect(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}&error=insufficient_credits`);
    }

    throw new Error(`Failed to deduct credit: ${msg || "unknown_error"}`);
  }

  // If the queue is already terminal (approved/rejected), ensure payload exists immediately.
  // This makes "unlock later" stable without relying on re-processing.
  await ensureFeedbackPayloadForTerminalQueue({
    queueId,
    userId: user.id,
    audioHash: queueAudioHash,
  });

  // Security/Observability (rein beobachtend, darf niemals den Flow brechen)
  await logSecurityEvent({
    eventType: "UNLOCK_CREATED",
    severity: "INFO",
    actorUserId: user.id,
    queueId,
    unlockId,
    reason: "paid_feedback_unlock",
    hashChecked: false,
    queueAudioHash: (queueRow as any)?.audio_hash ?? null,
    unlockAudioHash: (queueRow as any)?.audio_hash ?? null,
    metadata: { credits_spent: 1, source: "unlockPaidFeedbackAction" },
  });

  redirect(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`);
}
