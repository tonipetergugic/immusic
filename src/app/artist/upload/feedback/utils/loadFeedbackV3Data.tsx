import BackLink from "@/components/BackLink";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

export type FeedbackApiOk = {
  ok: true;
  queue_id: string;
  queue_title: string | null;
  feedback_state: "locked" | "unlocked_pending" | "unlocked_ready";
  status: "locked" | "unlocked_no_data" | "unlocked_ready";
  unlocked: boolean;
  access: {
    unlocked: boolean;
    has_paid: boolean;
    credit_balance: number;
    analysis_status: string | null;
  };
  payload: null | {
    schema_version?: number;
    summary?: { highlights?: string[]; severity?: "info" | "warn" | "critical" };
    hard_fail?: { triggered?: boolean; reasons?: any[] };
    metrics?: any;
    recommendations?: any[];
    track?: { duration_s?: number; decision?: string };
    events?: any;
  };
};

export type FeedbackApiErr = { ok: false; error: string };

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
    };

export async function loadFeedbackV3Data(params: {
  searchParams: Promise<{ queue_id?: string; error?: string }>;
}): Promise<LoadFeedbackV3Result> {
  const sp = await params.searchParams;
  const queueId = (sp?.queue_id ?? "").trim();
  const errorParam = (sp?.error ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("Failed to resolve host for feedback API.");

  const cookieHeader = (await cookies()).toString();

  const res = await fetch(
    `${proto}://${host}/api/ai/track-check/feedback?queue_id=${encodeURIComponent(queueId)}`,
    { cache: "no-store", headers: { cookie: cookieHeader } }
  );

  if (!res.ok) {
    if (res.status === 404) {
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
    throw new Error(`Feedback API request failed: ${res.status}`);
  }

  const data = (await res.json()) as FeedbackApiOk | FeedbackApiErr;

  if (!data || (data as any).ok !== true) {
    if (data && (data as any).ok === false && (data as any).error === "not_found") {
      return {
        kind: "render",
        element: (
          <div className="min-h-screen bg-[#0E0E10] text-white">
            <div className="w-full px-6 py-10">
              <BackLink href="/artist/upload/processing" label="Back" />
              <h1 className="mt-6 text-2xl font-bold">Feedback</h1>
              <p className="mt-2 text-white/70">Not found.</p>
            </div>
          </div>
        ),
      };
    }
    throw new Error("Failed to load feedback state.");
  }

  const okData = data as FeedbackApiOk;
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
  };
}
