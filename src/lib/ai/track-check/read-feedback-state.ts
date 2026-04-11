import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { writeFeedbackPayloadIfUnlocked } from "@/lib/ai/track-check/payload";

type QueueRow = {
  id: string;
  user_id: string;
  title: string | null;
  audio_hash: string | null;
  status: string | null;
};

type UnlockRow = {
  id: string;
  audio_hash: string | null;
};

type FeedbackPayloadRow = {
  audio_hash: string | null;
  payload_version: number | string | null;
  payload?: any;
};

type PrivateMetricsRow = {
  true_peak_overs: Array<any> | null;
};

export type FeedbackAccess = {
  unlocked: boolean;
  has_paid: boolean;
  credit_balance: number;
  analysis_status: string | null;
};

export type ReadFeedbackStateLocked = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  feedback_state: "locked";
  status: "locked";
  unlocked: false;
  access: FeedbackAccess;
  payload: null;
};

export type ReadFeedbackStateUnlockedPending = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  feedback_state: "unlocked_pending";
  status: "unlocked_no_data";
  unlocked: true;
  access: FeedbackAccess;
  payload: null;
};

export type ReadFeedbackStateUnlockedReady = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  feedback_state: "unlocked_ready";
  status: "unlocked_ready";
  unlocked: true;
  access: FeedbackAccess;
  payload_version: number;
  payload: any;
};

export type ReadFeedbackStateOk =
  | ReadFeedbackStateLocked
  | ReadFeedbackStateUnlockedPending
  | ReadFeedbackStateUnlockedReady;

export type ReadFeedbackStateErr = {
  ok: false;
  error:
    | "queue_fetch_failed"
    | "not_found"
    | "credits_fetch_failed"
    | "unlock_fetch_failed";
  status: number;
};

export type ReadFeedbackStateResult = ReadFeedbackStateOk | ReadFeedbackStateErr;

export async function readFeedbackState(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  queueId: string;
}): Promise<ReadFeedbackStateResult> {
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

  const analysisStatus = (queueRow as QueueRow).status ?? null;

  const [
    { data: creditRow, error: creditErr },
    { data: unlockRow, error: unlockErr },
  ] = await Promise.all([
    supabase
      .from("artist_credits")
      .select("balance")
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("track_ai_feedback_unlocks")
      .select("id, audio_hash")
      .eq("queue_id", queueId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (creditErr) {
    return { ok: false, error: "credits_fetch_failed", status: 500 };
  }

  const creditBalance =
    typeof (creditRow as any)?.balance === "number" ? (creditRow as any).balance : 0;

  if (unlockErr) {
    return { ok: false, error: "unlock_fetch_failed", status: 500 };
  }

  const queueHash = (queueRow as QueueRow).audio_hash;
  const unlockHash = unlockRow ? (unlockRow as UnlockRow).audio_hash : null;

  const unlocked = !!unlockRow?.id && !!queueHash && !!unlockHash && queueHash === unlockHash;

  if (!unlocked) {
    return {
      ok: true,
      queue_id: queueId,
      queue_title: (queueRow.title as string | null) ?? null,
      feedback_state: "locked",
      status: "locked",
      unlocked: false,
      access: {
        unlocked: false,
        has_paid: false,
        credit_balance: creditBalance,
        analysis_status: analysisStatus,
      },
      payload: null,
    };
  }

  const terminalStatus = (queueRow as QueueRow).status;

  let prePayloadRow: any = null;
  let prePayloadErr: any = null;
  let didRefresh = false;

  if (queueHash && (terminalStatus === "approved" || terminalStatus === "rejected")) {
    try {
      const pre = await supabase
        .from("track_ai_feedback_payloads")
        .select("audio_hash, payload_version, payload")
        .eq("queue_id", queueId)
        .eq("user_id", userId)
        .maybeSingle();

      prePayloadRow = (pre.data as FeedbackPayloadRow | null) ?? null;
      prePayloadErr = pre.error;

      const payloadHash = prePayloadRow?.audio_hash ?? null;
      const payloadVersion = Number(prePayloadRow?.payload_version ?? 0);

      const payloadOversLen = (() => {
        const arr = (prePayloadRow as any)?.payload?.events?.loudness?.true_peak_overs;
        return Array.isArray(arr) ? arr.length : null;
      })();

      const admin = getSupabaseAdmin();
      const { data: mRow, error: mErr } = await admin
        .from("track_ai_private_metrics")
        .select("true_peak_overs")
        .eq("queue_id", queueId)
        .maybeSingle();

      const mOvers = (mRow as PrivateMetricsRow | null)?.true_peak_overs;
      const metricsOversLen = Array.isArray(mOvers) ? mOvers.length : null;

      const needsRefresh =
        !prePayloadErr &&
        queueHash &&
        (
          !prePayloadRow ||
          !payloadHash ||
          payloadHash !== queueHash ||
          payloadVersion < 2 ||
          (typeof metricsOversLen === "number" && metricsOversLen > 0 && payloadOversLen === 0)
        );

      if (!mErr && needsRefresh) {
        await writeFeedbackPayloadIfUnlocked({
          admin,
          userId,
          queueId,
          audioHash: queueHash,
          decision: terminalStatus,
          integratedLufs: null,
          truePeakDbTp: null,
          clippedSampleCount: null,
        });
        didRefresh = true;
      }
    } catch {
      // best-effort: never break response
    }
  }

  if (queueHash) {
    let payloadRow: any = null;
    let payloadErr: any = null;

    if (!didRefresh && !prePayloadErr && prePayloadRow) {
      payloadRow = prePayloadRow;
      payloadErr = null;
    } else {
      const res = await supabase
        .from("track_ai_feedback_payloads")
        .select("audio_hash, payload_version, payload")
        .eq("queue_id", queueId)
        .eq("user_id", userId)
        .maybeSingle();

      payloadRow = (res.data as FeedbackPayloadRow | null) ?? null;
      payloadErr = res.error;
    }

    if (!payloadErr && payloadRow) {
      const payloadHash = (payloadRow as FeedbackPayloadRow).audio_hash ?? null;
      if (payloadHash && payloadHash === queueHash) {
        return {
          ok: true,
          queue_id: queueId,
          queue_title: (queueRow as QueueRow).title ?? null,
          feedback_state: "unlocked_ready",
          status: "unlocked_ready",
          unlocked: true,
          access: {
            unlocked: true,
            has_paid: true,
            credit_balance: creditBalance,
            analysis_status: analysisStatus,
          },
          payload_version: Number((payloadRow as FeedbackPayloadRow).payload_version ?? 1),
          payload: (payloadRow as FeedbackPayloadRow).payload ?? null,
        };
      }
    }
  }

  return {
    ok: true,
    queue_id: queueId,
    queue_title: (queueRow.title as string | null) ?? null,
    feedback_state: "unlocked_pending",
    status: "unlocked_no_data",
    unlocked: true,
    access: {
      unlocked: true,
      has_paid: true,
      credit_balance: creditBalance,
      analysis_status: analysisStatus,
    },
    payload: null,
  };
}
