"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse =
  | { ok: true; processed: true; decision: "approved"; feedback_available?: boolean; queue_id?: string }
  | { ok: true; processed: true; decision: "rejected"; reason?: string; feedback_available?: boolean; queue_id?: string }
  | { ok: true; processed: false; reason: string; queue_id?: string }
  | { ok: false; error: string };

type Props = { credits: number; queueId: string };

export default function ProcessingClient({ credits, queueId }: Props) {
  const router = useRouter();
  const [statusText, setStatusText] = useState<string>("Processing your track…");
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [approved, setApproved] = useState(false);
  const [canFeedback, setCanFeedback] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [visualStep, setVisualStep] = useState(0);

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

        const resQueueId = (data as any).queue_id as string | undefined;
        const isOurQueue = typeof resQueueId === "string" && resQueueId === queueId;

        if (data.processed === false) {
          setStatusText("Queued… processing will start shortly.");
          timerRef.current = window.setTimeout(tick, POLL_MS);
          return;
        }

        if (!isOurQueue) {
          timerRef.current = window.setTimeout(tick, POLL_MS);
          return;
        }

        if (data.decision === "approved") {
          setApproved(true);
          setCanFeedback(!!data.feedback_available);
          setStatusText("Approved. Your track is now in My Tracks.");
          return; // stop polling
        }

        // rejected (our queue)
        setRejected(true);

        const rr = (data as any).reason as string | undefined;
        setRejectReason(rr ?? null);

        if (rr === "duplicate_audio" || rr === "duplicate") {
          setStatusText("This audio already exists on IMUSIC. Uploading it again is not allowed.");
        } else {
          setStatusText("Processing completed. Detailed AI feedback is available to unlock for this upload.");
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
  }, [retryKey, queueId]);

  useEffect(() => {
    if (approved || rejected || timedOut || errorText) return;

    const steps = [
      "Preparing analysis…",
      "Checking audio quality…",
      "Inspecting technical details…",
      "Finalizing result…",
    ];

    setVisualStep(0);

    const interval = window.setInterval(() => {
      setVisualStep((prev) => (prev + 1) % steps.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, [approved, rejected, timedOut, errorText, retryKey]);

  const visualStatuses = [
    "Preparing analysis…",
    "Checking audio quality…",
    "Inspecting technical details…",
    "Finalizing result…",
  ];

  const activeVisualStatus = visualStatuses[visualStep] ?? visualStatuses[0];
  const isRunning = !approved && !rejected && !timedOut && !errorText;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E0E10] px-6 text-white">
      <div className="mb-6 w-full max-w-2xl text-center">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          <span className="text-[#00FFC6]">Processing</span> your{" "}
          <span className="text-[#00FFC6]">track</span>
        </h1>

        {isRunning ? (
          <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.025] p-7 text-left shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {activeVisualStatus}
                </p>

                {/* statusText entfernt für klarere UI */}
              </div>

              <div className="relative mt-1 h-5 w-5 shrink-0">
                <span className="absolute inset-0 rounded-full border border-white/15" />
                <span className="absolute inset-0 rounded-full bg-[#00FFC6]/20 blur-[6px]" />
                <span className="absolute inset-0 animate-ping rounded-full bg-[#00FFC6]/25" />
                <span className="absolute inset-[4px] rounded-full bg-[#00FFC6]" />
              </div>
            </div>

            <div className="mt-8">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="processing-bar h-full w-1/3 rounded-full bg-[#00FFC6]" />
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-white/70 sm:text-[15px]">
              Do not close this page — your track is currently being processed.
            </p>
          </div>
        ) : !rejected && !approved ? (
          <p className="text-base text-white/60">
            {statusText}
          </p>
        ) : null}

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
                ? "This audio already exists on IMUSIC. Uploading it again is not allowed."
                : "Processing completed. Detailed AI feedback is available to unlock for this upload."}
            </p>
            {rejectReason === "duplicate_audio" || rejectReason === "duplicate" ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold hover:border-white/25"
                  onClick={() => router.replace("/artist/upload")}
                >
                  Back to Upload
                </button>
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
                  onClick={() => router.replace("/artist/my-tracks")}
                >
                  Go to My Tracks
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold hover:border-white/25"
                  onClick={() => router.replace("/artist/upload")}
                >
                  Back to Upload
                </button>
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
                  onClick={() => router.replace(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`)}
                >
                  Start detailed AI analysis (1 Credit)
                </button>
              </div>
            )}
          </div>
        )}

        {approved && (
          <div className="mt-6">
            <p className="text-white/70 mb-4">
              Track approved. You may publish.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
              onClick={() => router.replace("/artist/my-tracks")}
            >
              Go to My Tracks
            </button>

            {credits >= 1 ? (
              <button
                type="button"
                className="px-6 py-3 rounded-xl border border-white/15 bg-[#111112] text-white font-semibold hover:border-white/25"
                onClick={() => router.push(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`)}
              >
                Detailed AI Analysis
              </button>
            ) : null}
            </div>
          </div>
        )}

        {errorText && (
          <p className="mt-4 text-red-400 font-medium">
            {errorText}
          </p>
        )}
      </div>

      <style jsx>{`
        .processing-bar {
          animation: processing-slide 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 0 24px rgba(0, 255, 198, 0.35);
        }

        @keyframes processing-slide {
          0% {
            transform: translateX(-130%);
          }
          55% {
            transform: translateX(105%);
          }
          100% {
            transform: translateX(280%);
          }
        }
      `}</style>
    </div>
  );
}
