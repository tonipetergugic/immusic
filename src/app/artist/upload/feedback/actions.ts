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

  const { data: pm, error: pmErr } = await admin
    .from("track_ai_private_metrics")
    .select("integrated_lufs,true_peak_db_tp,clipped_sample_count,crest_factor_db,phase_correlation,mid_rms_dbfs,side_rms_dbfs,mid_side_energy_ratio,stereo_width_index,spectral_sub_rms_dbfs,spectral_low_rms_dbfs,spectral_lowmid_rms_dbfs,spectral_mid_rms_dbfs,spectral_highmid_rms_dbfs,spectral_high_rms_dbfs,spectral_air_rms_dbfs,mean_short_crest_db,p95_short_crest_db,transient_density,punch_index,loudness_range_lu")
    .eq("queue_id", queueId)
    .maybeSingle();

  if (pmErr) {
    console.error("[TERMINAL] private metrics read failed:", pmErr);
    throw new Error("private_metrics_read_failed");
  }

  if (!pm) {
    throw new Error("private_metrics_missing");
  }

  const payload: FeedbackPayloadV2 = buildFeedbackPayloadV2Mvp({
    queueId,
    audioHash,
    decision,
    integratedLufs: pm.integrated_lufs,
    truePeakDbTp: pm.true_peak_db_tp,
    loudnessRangeLu: (pm as any).loudness_range_lu,
    clippedSampleCount: pm.clipped_sample_count,
    crestFactorDb: pm.crest_factor_db,
    phaseCorrelation: (pm as any).phase_correlation,
    midRmsDbfs: (pm as any).mid_rms_dbfs,
    sideRmsDbfs: (pm as any).side_rms_dbfs,
    midSideEnergyRatio: (pm as any).mid_side_energy_ratio,
    stereoWidthIndex: (pm as any).stereo_width_index,
    spectralSubRmsDbfs: (pm as any).spectral_sub_rms_dbfs,
    spectralLowRmsDbfs: (pm as any).spectral_low_rms_dbfs,
    spectralLowMidRmsDbfs: (pm as any).spectral_lowmid_rms_dbfs,
    spectralMidRmsDbfs: (pm as any).spectral_mid_rms_dbfs,
    spectralHighMidRmsDbfs: (pm as any).spectral_highmid_rms_dbfs,
    spectralHighRmsDbfs: (pm as any).spectral_high_rms_dbfs,
    spectralAirRmsDbfs: (pm as any).spectral_air_rms_dbfs,
    meanShortCrestDb: (pm as any).mean_short_crest_db,
    p95ShortCrestDb: (pm as any).p95_short_crest_db,
    transientDensity: (pm as any).transient_density,
    punchIndex: (pm as any).punch_index,
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
  const AI_DEBUG = process.env.AI_DEBUG === "1";
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
    .select("id, user_id, audio_hash, status")
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

  // Read server-only private metrics and write deterministic V2 payload (no re-run, no HTTP self-call)
  const admin = getSupabaseAdmin();
  const userId = user.id;
  const audioHash = queueAudioHash;
  const status = String((queueRow as any)?.status ?? "");

  type PrivateMetricsRow = {
    integrated_lufs: number;
    true_peak_db_tp: number;
    loudness_range_lu: number | null;
    title: string;
    clipped_sample_count: number;
    crest_factor_db: number | null;
    phase_correlation: number | null;
    mid_rms_dbfs: number | null;
    side_rms_dbfs: number | null;
    mid_side_energy_ratio: number | null;
    stereo_width_index: number | null;
    spectral_sub_rms_dbfs: number | null;
    spectral_low_rms_dbfs: number | null;
    spectral_lowmid_rms_dbfs: number | null;
    spectral_mid_rms_dbfs: number | null;
    spectral_highmid_rms_dbfs: number | null;
    spectral_high_rms_dbfs: number | null;
    spectral_air_rms_dbfs: number | null;
    mean_short_crest_db: number | null;
    p95_short_crest_db: number | null;
    transient_density: number | null;
    punch_index: number | null;
  };

  const { data: pm, error: pmErr } = await admin
    .from("track_ai_private_metrics")
    .select("integrated_lufs,true_peak_db_tp,title,clipped_sample_count,crest_factor_db,phase_correlation,mid_rms_dbfs,side_rms_dbfs,mid_side_energy_ratio,stereo_width_index,spectral_sub_rms_dbfs,spectral_low_rms_dbfs,spectral_lowmid_rms_dbfs,spectral_mid_rms_dbfs,spectral_highmid_rms_dbfs,spectral_high_rms_dbfs,spectral_air_rms_dbfs,mean_short_crest_db,p95_short_crest_db,transient_density,punch_index,loudness_range_lu")
    .eq("queue_id", queueId)
    .maybeSingle<PrivateMetricsRow>();

  if (pmErr) {
    console.error("[UNLOCK] private metrics read failed:", pmErr);
    throw new Error("private_metrics_read_failed");
  }

  if (!pm) {
    throw new Error("private_metrics_missing");
  }

  const decision = status === "approved" ? "approved" : "rejected";

  if (!audioHash) {
    throw new Error("audio_hash_missing");
  }

  const payload: FeedbackPayloadV2 = buildFeedbackPayloadV2Mvp({
    queueId,
    audioHash,
    decision,
    integratedLufs: pm.integrated_lufs,
    truePeakDbTp: pm.true_peak_db_tp,
    loudnessRangeLu: pm.loudness_range_lu,
    clippedSampleCount: pm.clipped_sample_count,
    crestFactorDb: pm.crest_factor_db,
    phaseCorrelation: pm.phase_correlation,
    midRmsDbfs: pm.mid_rms_dbfs,
    sideRmsDbfs: pm.side_rms_dbfs,
    midSideEnergyRatio: pm.mid_side_energy_ratio,
    stereoWidthIndex: pm.stereo_width_index,
    spectralSubRmsDbfs: pm.spectral_sub_rms_dbfs,
    spectralLowRmsDbfs: pm.spectral_low_rms_dbfs,
    spectralLowMidRmsDbfs: pm.spectral_lowmid_rms_dbfs,
    spectralMidRmsDbfs: pm.spectral_mid_rms_dbfs,
    spectralHighMidRmsDbfs: pm.spectral_highmid_rms_dbfs,
    spectralHighRmsDbfs: pm.spectral_high_rms_dbfs,
    spectralAirRmsDbfs: pm.spectral_air_rms_dbfs,
    meanShortCrestDb: pm.mean_short_crest_db,
    p95ShortCrestDb: pm.p95_short_crest_db,
    transientDensity: pm.transient_density,
    punchIndex: pm.punch_index,
  });

  const { error: payloadErr } = await (admin as any)
    .from("track_ai_feedback_payloads")
    .upsert(
      {
        queue_id: queueId,
        user_id: userId,
        audio_hash: audioHash,
        payload_version: 2,
        payload,
      },
      { onConflict: "queue_id" }
    );

  if (payloadErr) {
    console.error("[UNLOCK] payload upsert failed:", payloadErr);
    throw new Error("payload_upsert_failed");
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
