"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    .select("id, user_id")
    .eq("id", queueId)
    .maybeSingle();

  if (queueErr) {
    throw new Error(`Failed to load queue item: ${queueErr.message}`);
  }
  if (!queueRow || queueRow.user_id !== user.id) {
    redirect("/artist/upload/feedback?error=not_found");
  }

  // 2) Persistenter Unlock pro Queue (idempotent)
  // Versuch zuerst zu inserten: wenn bereits vorhanden, kein Credit-Spend.
  const { data: insertedRows, error: insertErr } = await supabase
    .from("track_ai_feedback_unlocks")
    .insert({ queue_id: queueId, user_id: user.id })
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
      redirect(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}&error=insufficient_credits`);
    }

    throw new Error(`Failed to deduct credit: ${msg || "unknown_error"}`);
  }

  redirect(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`);
}
