import BackLink from "@/components/BackLink";
import { unlockPaidFeedbackAction } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security/logSecurityEvent";
import { headers, cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function UploadFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ queue_id?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const queueId = (sp?.queue_id ?? "").trim();
  const error = (sp?.error ?? "").trim();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: creditRow, error: creditErr } = await supabase
    .from("artist_credits")
    .select("balance")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (creditErr) {
    throw new Error(`Failed to load credit balance: ${creditErr.message}`);
  }

  const creditBalance =
    typeof creditRow?.balance === "number" ? creditRow.balance : 0;

  if (!queueId) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <BackLink href="/artist/upload/processing" label="Back" />
          <h1 className="text-2xl font-bold mt-6">Detailed AI Feedback</h1>
          <p className="text-white/70 mt-2">
            Missing parameter: <span className="font-semibold text-white">queue_id</span>
          </p>
        </div>
      </div>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Failed to resolve host for feedback API.");
  }

  const cookieHeader = (await cookies()).toString();

  const res = await fetch(
    `${proto}://${host}/api/ai/track-check/feedback?queue_id=${encodeURIComponent(queueId)}`,
    {
      cache: "no-store",
      headers: {
        cookie: cookieHeader,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Feedback API request failed: ${res.status}`);
  }

  const data = (await res.json()) as
    | {
        ok: true;
        queue_id: string;
        queue_title: string | null;
        status: "locked" | "unlocked_no_data";
        unlocked: boolean;
        payload: null;
      }
    | { ok: false; error: string };

  if (!data || data.ok !== true) {
    // Anti-leak: if API returns "not_found", show same "Not found." here
    if (data && data.ok === false && data.error === "not_found") {
      return (
        <div className="min-h-screen bg-[#0E0E10] text-white">
          <div className="max-w-2xl mx-auto px-6 py-10">
            <BackLink href="/artist/upload/processing" label="Back" />
            <h1 className="text-2xl font-bold mt-6">Detailed AI Feedback</h1>
            <p className="text-white/70 mt-2">Not found.</p>
          </div>
        </div>
      );
    }

    throw new Error("Failed to load feedback state.");
  }

  const unlocked = data.status !== "locked";
  const queueTitle = data.queue_title ?? "Untitled";

  // Optional: queue audio_hash für Observability (rein beobachtend, darf niemals den Flow brechen)
  let queueAudioHash: string | null = null;
  try {
    const { data: qh, error: qhErr } = await supabase
      .from("tracks_ai_queue")
      .select("audio_hash")
      .eq("id", queueId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!qhErr) {
      queueAudioHash = (qh as any)?.audio_hash ?? null;
    }
  } catch {
    // ignore
  }

  // Security/Observability (rein beobachtend, darf niemals den Flow brechen)
  await logSecurityEvent({
    eventType: unlocked ? "FEEDBACK_ACCESS_GRANTED" : "FEEDBACK_ACCESS_DENIED",
    severity: "INFO",
    actorUserId: user.id,
    queueId,
    unlockId: null,
    reason: unlocked ? null : "NO_UNLOCK",
    hashChecked: false,
    queueAudioHash,
    unlockAudioHash: null,
    metadata: {
      source: "UploadFeedbackPage",
      api_status: data.status,
      credit_balance: creditBalance,
      error_param: error || null,
    },
  });

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <BackLink href="/artist/upload/processing" label="Back" />

        <h1 className="text-2xl font-bold mt-6">Detailed AI Feedback</h1>

        <p className="text-white/60 mt-2">
          Upload: <span className="text-white/80">{queueTitle}</span>
        </p>

        <p className="text-white/40 text-sm mt-2">
          Note: AI feedback is tied to the exact audio file. If you change and re-upload the audio, a new analysis unlock is required.
        </p>

        {unlocked ? (
          <div className="mt-4 space-y-4">
            <p className="text-white/70">Unlocked – analysis will appear once data is available.</p>

            {/* Guarded placeholder: only visible when unlocked */}
            <div className="rounded-xl bg-[#111112] p-5 border border-white/5">
              <h2 className="text-base font-semibold">Analysis (Placeholder)</h2>
              <p className="text-white/60 text-sm mt-2">
                Issues, metrics, and recommendations will appear here once the analyzer provides real data.
              </p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-lg bg-black/20 p-4 border border-white/5">
                  <p className="text-white/70 text-sm font-medium">Issues</p>
                  <p className="text-white/50 text-xs mt-1">No data yet</p>
                </div>

                <div className="rounded-lg bg-black/20 p-4 border border-white/5">
                  <p className="text-white/70 text-sm font-medium">Metrics</p>
                  <p className="text-white/50 text-xs mt-1">No data yet</p>
                </div>

                <div className="rounded-lg bg-black/20 p-4 border border-white/5">
                  <p className="text-white/70 text-sm font-medium">Recommendations</p>
                  <p className="text-white/50 text-xs mt-1">No data yet</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-white/70 mt-4">
            Without paid feedback we do not show details, metrics, or reasons.
          </p>
        )}

        {!unlocked && error === "insufficient_credits" && (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
            <p className="text-red-200 font-medium">Not enough credits.</p>
            <p className="text-red-200/80 text-sm mt-1">
              You need at least 1 credit to unlock this feedback.
            </p>
          </div>
        )}

        {error === "missing_queue_id" && (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
            <p className="text-red-200 font-medium">Missing queue_id.</p>
          </div>
        )}

        {!unlocked ? (
          creditBalance <= 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-lg font-semibold text-white">No credits available</div>
              <p className="mt-2 text-sm text-white/60">
                You currently have 0 credits. Detailed AI feedback requires 1 credit.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled
                  className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold opacity-50 cursor-not-allowed"
                >
                  Credits kaufen
                </button>
                <Link
                  href="/artist/my-tracks"
                  className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0] inline-flex items-center justify-center text-center"
                >
                  Back to My Tracks
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-[#111112] p-5">
              <p className="text-white/80 font-semibold">Unlock required</p>
              <p className="text-white/70 mt-1">
                Unlock detailed AI feedback for this upload using 1 credit.
              </p>
              <p className="text-white/80 mt-3">
                Cost: <span className="font-semibold text-white">1 credit</span>
                <span className="text-white/40 text-sm ml-2">
                  (Your balance: {creditBalance})
                </span>
              </p>

              <form action={unlockPaidFeedbackAction} className="mt-4">
                <input type="hidden" name="queue_id" value={queueId} />
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
                >
                  Unlock (1 credit)
                </button>
              </form>
            </div>
          )
        ) : (
          <div className="mt-6 rounded-xl bg-[#111112] p-5 border border-white/5">
            <p className="text-white/80 font-semibold">Feedback unlocked</p>
            <p className="text-white/70 mt-1">
              This feedback has already been unlocked. Your current credit balance does not affect access.
            </p>
            <p className="text-white/50 mt-2 text-sm">
              Credits are required for unlocking additional AI feedback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
