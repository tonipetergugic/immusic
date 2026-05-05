import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ArtistDecisionPayload } from "@/components/decision-center/types";
import { buildDecisionPayloadFromArtistFeedbackPayload } from "@/lib/ai/decision-center/artistFeedbackToDecisionPayload";

type QueueRow = {
  id: string;
  user_id: string;
  title: string | null;
  audio_hash: string | null;
  status: string | null;
};

type EngineFeedbackPayloadRow = {
  audio_hash: string | null;
  payload_schema: string | null;
  payload?: unknown;
};

export type ReadDecisionCenterStateOk = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  queue_audio_hash: string | null;
  analysis_status: string | null;
  decision_payload: ArtistDecisionPayload | null;
  payload_source: "engine" | "none";
};

export type ReadDecisionCenterStateErr = {
  ok: false;
  error:
    | "queue_fetch_failed"
    | "not_found"
    | "engine_payload_fetch_failed"
    | "engine_payload_hash_mismatch"
    | "engine_payload_invalid";
  status: number;
};

export type ReadDecisionCenterStateResult =
  | ReadDecisionCenterStateOk
  | ReadDecisionCenterStateErr;

export async function readDecisionCenterState(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  queueId: string;
}): Promise<ReadDecisionCenterStateResult> {
  const { supabase, userId, queueId } = params;

  const { data: queueRow, error: queueErr } = await supabase
    .from("tracks_ai_queue")
    .select("id, user_id, title, audio_hash, status")
    .eq("id", queueId)
    .maybeSingle();

  if (queueErr) {
    return { ok: false, error: "queue_fetch_failed", status: 500 };
  }

  if (!queueRow || queueRow.user_id !== userId) {
    return { ok: false, error: "not_found", status: 404 };
  }

  const queue = queueRow as QueueRow;
  const queueHash = queue.audio_hash ?? null;

  if (!queueHash) {
    return {
      ok: true,
      queue_id: queueId,
      queue_title: queue.title ?? null,
      queue_audio_hash: null,
      analysis_status: queue.status ?? null,
      decision_payload: null,
      payload_source: "none",
    };
  }

  const admin = getSupabaseAdmin();
  const { data: enginePayloadRow, error: enginePayloadErr } = await admin
    .from("track_ai_feedback_payloads_engine" as any)
    .select("audio_hash, payload_schema, payload")
    .eq("queue_id", queueId)
    .eq("user_id", userId)
    .eq("payload_schema", "artist_feedback_payload")
    .maybeSingle();

  if (enginePayloadErr) {
    return { ok: false, error: "engine_payload_fetch_failed", status: 500 };
  }

  if (!enginePayloadRow) {
    return {
      ok: true,
      queue_id: queueId,
      queue_title: queue.title ?? null,
      queue_audio_hash: queueHash,
      analysis_status: queue.status ?? null,
      decision_payload: null,
      payload_source: "none",
    };
  }

  const engineRow = enginePayloadRow as EngineFeedbackPayloadRow;
  const engineHash = engineRow.audio_hash ?? null;

  if (!engineHash || engineHash !== queueHash) {
    return { ok: false, error: "engine_payload_hash_mismatch", status: 409 };
  }

  const decisionPayload = buildDecisionPayloadFromArtistFeedbackPayload(
    engineRow.payload ?? null
  );

  if (!decisionPayload) {
    return { ok: false, error: "engine_payload_invalid", status: 422 };
  }

  return {
    ok: true,
    queue_id: queueId,
    queue_title: queue.title ?? null,
    queue_audio_hash: queueHash,
    analysis_status: queue.status ?? null,
    decision_payload: decisionPayload,
    payload_source: "engine",
  };
}
