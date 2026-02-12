"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse =
  | { ok: true; processed: true; decision: "approved"; feedback_available?: boolean; queue_id?: string }
  | { ok: true; processed: true; decision: "rejected"; reason?: string; feedback_available?: boolean; queue_id?: string }
  | { ok: true; processed: false; reason: string; queue_id?: string }
  | { ok: false; error: string };

type Props = { credits: number };

export default function ProcessingClient({ credits }: Props) {
  const router = useRouter();
  const [statusText, setStatusText] = useState<string>("Processing your track…");
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [approved, setApproved] = useState(false);
  const [canFeedback, setCanFeedback] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const pollCountRef = useRef(0);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const POLL_MS = 5000;
    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

    let cancelled = false;

    // Reset UI states for a fresh run (triggered by first mount or Retry Processing)
    setTimedOut(false);
    setErrorText(null);
    setRejected(false);
    setApproved(false);
    setCanFeedback(false);
    setStatusText("Processing your track…");
    setRejectReason(null);

    pollCountRef.current = 0;
    startedAtRef.current = Date.now();

    async function tick() {
      try {
        if (cancelled) return;

        pollCountRef.current += 1;

        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed >= TIMEOUT_MS) {
          setTimedOut(true);
          setStatusText("Taking longer than expected.");
          // Stop polling on timeout (clear end state)
          return;
        }

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
          timerRef.current = window.setTimeout(tick, POLL_MS);
          return;
        }

        if (data.decision === "approved") {
          setApproved(true);
          setCanFeedback(!!data.feedback_available);
          setStatusText("Approved. Your track is now in My Tracks.");
          return; // stop polling
        }

        // rejected
        setRejected(true);

        const rr = (data as any).reason as string | undefined;
        setRejectReason(rr ?? null);

        if (rr === "duplicate_audio" || rr === "duplicate") {
          setStatusText("This audio already exists on IMUSIC. Uploading it again is not allowed.");
        } else {
          setStatusText("Your track was not approved due to technical listenability issues.");
        }

        // stop polling
      } catch {
        if (cancelled) return;
        setErrorText("Processing failed. Please reload the page.");
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [retryKey]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] text-white">
      <div className="text-center mb-6 max-w-lg px-6">
        <h1 className="text-2xl font-bold mb-2">Processing your track</h1>
        <p className="text-white/60">
          {statusText}
        </p>

        {timedOut && !approved && !rejected && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry Processing
            </button>

            <button
              type="button"
              className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold hover:border-white/25"
              onClick={() => router.replace("/artist/upload")}
            >
              Back to Upload
            </button>
          </div>
        )}

        {rejected && (
          <div className="mt-6 text-white/70">
            <p className="mb-3">
              {rejectReason === "duplicate_audio" || rejectReason === "duplicate"
                ? "Dieses Audio existiert bereits auf IMUSIC. Ein erneuter Upload ist nicht erlaubt."
                : "Der Track konnte aufgrund technischer Hörbarkeitsprobleme nicht freigegeben werden."}
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
