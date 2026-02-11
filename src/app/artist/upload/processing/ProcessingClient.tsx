"use client";

import { useEffect, useRef, useState } from "react";
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
  const [hashError, setHashError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const pollCountRef = useRef(0);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const hashKickstartedRef = useRef(false);

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
    setHashError(false);
    setStatusText("Processing your track…");

    pollCountRef.current = 0;
    startedAtRef.current = Date.now();
    hashKickstartedRef.current = false;

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

        // Auto-recover: if hash not ready, kick off hash-next once (best-effort)
        if (
          data.processed === false &&
          (data as any).reason === "waiting_for_hash" &&
          typeof (data as any).queue_id === "string" &&
          !hashKickstartedRef.current
        ) {
          hashKickstartedRef.current = true;
          try {
            await fetch("/api/ai/track-check/hash-next", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ queue_id: (data as any).queue_id }),
            });
          } catch {
            // best-effort
          }
        }

        if (data.processed === false) {
          const reason = (data as any).reason as string | undefined;

          if (reason === "hash_error") {
            setHashError(true);
            setStatusText("Hashing failed. Please retry.");
            // Stop polling here: user must click "Retry Hash" (avoids noisy loops)
            return;
          }

          setHashError(false);
          setStatusText("Queued… processing will start shortly.");
          timerRef.current = window.setTimeout(tick, POLL_MS);
          return;
        }

        if (data.decision === "approved") {
          setApproved(true);
          setHashError(false);
          setCanFeedback(!!data.feedback_available);
          setStatusText("Approved. Your track is now in My Tracks.");
          return; // stop polling
        }

        // rejected
        setRejected(true);
        setHashError(false);
        setStatusText("Your track was not approved due to technical listenability issues.");
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

        {hashError && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
              onClick={async () => {
                if (!queueId) return;
                setHashError(false);
                setStatusText("Retrying hash…");
                try {
                  await fetch("/api/ai/track-check/hash-next", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ queue_id: queueId }),
                  });
                } catch {
                  setHashError(true);
                  setStatusText("Hashing failed. Please retry.");
                }
              }}
            >
              Retry Hash
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
