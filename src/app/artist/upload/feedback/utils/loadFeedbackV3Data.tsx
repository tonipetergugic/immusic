import BackLink from "@/components/BackLink";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedServerUser } from "@/lib/supabase/getCachedServerUser";
import {
  readFeedbackState,
  type ReadFeedbackStateErr,
  type ReadFeedbackStateOk,
} from "@/lib/ai/track-check/read-feedback-state";
import { redirect } from "next/navigation";

export type FeedbackApiOk = ReadFeedbackStateOk;

export type FeedbackApiErr = {
  ok: false;
  error: ReadFeedbackStateErr["error"];
};

export type LoadFeedbackV3Result =
  | {
      kind: "render";
      element: JSX.Element;
    }
  | {
      kind: "ok";
      supabase: any;
      userId: string;
      queueId: string;
      errorParam: string;
      creditBalance: number;
      data: FeedbackApiOk;
      unlocked: boolean;
      isReady: boolean;
      payload: any | null;
      queueTitle: string;
      queueAudioHash: string | null;
    };

export async function loadFeedbackV3Data(params: {
  searchParams: Promise<{ queue_id?: string; error?: string }>;
}): Promise<LoadFeedbackV3Result> {
  const sp = await params.searchParams;
  const queueId = (sp?.queue_id ?? "").trim();
  const errorParam = (sp?.error ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const user = await getCachedServerUser();

  if (!user) redirect("/login");

  if (!queueId) {
    return {
      kind: "render",
      element: (
        <div className="min-h-screen bg-[#0E0E10] text-white">
          <div className="w-full px-6 py-10">
            <BackLink href="/artist/upload/processing" label="Back" />
            <h1 className="mt-6 text-2xl font-bold">Feedback</h1>
            <p className="mt-2 text-white/70">
              Missing parameter: <span className="font-semibold text-white">queue_id</span>
            </p>
          </div>
        </div>
      ),
    };
  }

  const data = await readFeedbackState({
    supabase,
    userId: user.id,
    queueId,
  });

  if (!data.ok) {
    if (data.error === "not_found") {
      return {
        kind: "render",
        element: (
          <div className="min-h-screen bg-[#0E0E10] text-white">
            <div className="w-full px-6 py-10">
              <BackLink href={`/artist/upload/processing?queue_id=${encodeURIComponent(queueId)}`} label="Back" />
              <h1 className="mt-6 text-2xl font-bold">Feedback</h1>
              <p className="mt-2 text-white/70">
                Feedback is not ready (or not found) for this queue yet.
              </p>
              <p className="mt-2 text-xs text-white/40 break-all">
                queue_id: {queueId}
              </p>
            </div>
          </div>
        ),
      };
    }

    throw new Error(`Failed to load feedback state: ${data.error}`);
  }

  const okData = data;
  const unlocked = !!okData.access?.unlocked;
  const creditBalance = typeof okData.access?.credit_balance === "number" ? okData.access.credit_balance : 0;
  const queueTitle = okData.queue_title ?? "Untitled";
  const isReady = okData.feedback_state === "unlocked_ready" && !!okData.payload;
  const payload = okData.payload ?? null;

  return {
    kind: "ok",
    supabase,
    userId: user.id,
    queueId,
    errorParam,
    creditBalance,
    data: okData,
    unlocked,
    isReady,
    payload,
    queueTitle,
    queueAudioHash: okData.queue_audio_hash ?? null,
  };
}
