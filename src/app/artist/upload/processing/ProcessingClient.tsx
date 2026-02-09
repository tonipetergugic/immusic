"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse =
  | { ok: true; processed: true; decision: "approved"; feedback_available?: boolean; queue_id?: string }
  | { ok: true; processed: true; decision: "rejected"; feedback_available?: boolean; queue_id?: string }
  | { ok: true; processed: false; reason: string; queue_id?: string }
  | { ok: false; error: string };

type Props = { credits: number };

export default function ProcessingClient({ credits }: Props) {
  const router = useRouter();
  const [statusText, setStatusText] = useState<string>("Processing your track…");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [approved, setApproved] = useState(false);
  const [canFeedback, setCanFeedback] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function tick() {
      try {
        const res = await fetch("/api/ai/track-check/process-next", { method: "POST" });
        const data = (await res.json()) as ApiResponse;

        if (cancelled) return;

        if (!("ok" in data) || data.ok !== true) {
          setErrorText("Processing failed. Please try again.");
          return;
        }
        if ("queue_id" in data && typeof (data as any).queue_id === "string") {
          setQueueId((data as any).queue_id);
        }

        if (data.processed === false) {
          setStatusText("Queued… processing will start shortly.");
          timer = window.setTimeout(tick, 5000);
          return;
        }

        if (data.decision === "approved") {
          setApproved(true);
          setCanFeedback(!!data.feedback_available);
          setStatusText("Approved. Your track is now in My Tracks.");
          return; // stop polling on success
        }

        // rejected
        setRejected(true);
        setStatusText("Your track was not approved due to technical listenability issues.");
        // Stop polling on reject
      } catch {
        if (cancelled) return;
        setErrorText("Processing failed. Please reload the page.");
      }
    }

    // Start immediately
    tick();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] text-white">
      <div className="text-center mb-6 max-w-lg px-6">
        <h1 className="text-2xl font-bold mb-2">Processing your track</h1>
        <p className="text-white/60">
          {statusText}
        </p>

        {rejected && (
          <div className="mt-6 text-white/70">
            <p className="mb-3">
              Der Track konnte aufgrund technischer Hörbarkeitsprobleme nicht freigegeben werden.
            </p>
            {credits >= 1 ? (
              <button
                type="button"
                className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
                onClick={() => {
                  if (!queueId) return;
                  router.push(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`);
                }}
              >
                Detaillierte KI-Auswertung (1 Credit)
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  disabled
                  className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold opacity-50 cursor-not-allowed"
                >
                  Credits kaufen
                </button>
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
                  onClick={() => router.replace("/artist/my-tracks")}
                >
                  Go to My Tracks
                </button>
              </div>
            )}
          </div>
        )}

        {approved && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
              onClick={() => router.replace("/artist/my-tracks")}
            >
              Go to My Tracks
            </button>

            {credits >= 1 && queueId ? (
              <button
                type="button"
                className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold hover:border-white/25"
                onClick={() => router.push(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`)}
              >
                Detaillierte KI-Auswertung (1 Credit)
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold opacity-50 cursor-not-allowed"
              >
                Credits kaufen
              </button>
            )}
          </div>
        )}

        {errorText && (
          <p className="mt-4 text-red-400 font-medium">
            {errorText}
          </p>
        )}
      </div>
    </div>
  );
}
