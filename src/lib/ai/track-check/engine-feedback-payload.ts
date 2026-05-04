import { asAdminClient } from "@/lib/ai/track-check/admin";

export async function writeEngineFeedbackPayload(params: {
  admin: any;
  userId: string;
  queueId: string;
  audioHash: string | null;
  artistFeedbackPayload: Record<string, unknown>;
  engineRunId?: string | null;
  trackId?: string | null;
}): Promise<void> {
  const { admin, userId, queueId, artistFeedbackPayload } = params;

  if (!artistFeedbackPayload || typeof artistFeedbackPayload !== "object" || Array.isArray(artistFeedbackPayload)) {
    return;
  }

  const adminClient = asAdminClient(admin);

  const { data: queueRow, error: queueErr } = await adminClient
    .from("tracks_ai_queue")
    .select("user_id, audio_hash")
    .eq("id", queueId)
    .maybeSingle();

  if (queueErr || !queueRow || (queueRow as { user_id?: string }).user_id !== userId) {
    return;
  }

  const queueAudioHash =
    typeof queueRow?.audio_hash === "string" && queueRow.audio_hash.trim().length > 0
      ? queueRow.audio_hash.trim()
      : null;

  if (!queueAudioHash) {
    return;
  }

  const row = {
    queue_id: queueId,
    user_id: userId,
    track_id: params.trackId ?? null,
    audio_hash: queueAudioHash,
    payload_schema: "artist_feedback_payload",
    payload: artistFeedbackPayload,
    source: "analysis_engine_sidecar",
    engine_run_id: params.engineRunId ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingPayload } = await adminClient
    .from("track_ai_feedback_payloads_engine" as any)
    .select("id")
    .eq("queue_id", queueId)
    .maybeSingle();

  if ((existingPayload as { id?: string } | null)?.id) {
    await adminClient
      .from("track_ai_feedback_payloads_engine" as any)
      .update(row)
      .eq("queue_id", queueId);
  } else {
    await adminClient
      .from("track_ai_feedback_payloads_engine" as any)
      .insert(row);
  }
}
