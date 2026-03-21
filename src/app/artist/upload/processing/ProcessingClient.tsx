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
  const [buyingCredits, setBuyingCredits] = useState(false);

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
    ];

    setVisualStep(0);

    let current = 0;

    const interval = window.setInterval(() => {
      current += 1;

      if (current >= steps.length - 1) {
        setVisualStep(steps.length - 1);
        window.clearInterval(interval);
        return;
      }

      setVisualStep(current);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [approved, rejected, timedOut, errorText, retryKey]);

  const visualStatuses = [
    "Preparing analysis…",
    "Checking audio quality…",
    "Inspecting technical details…",
  ];

  const activeVisualStatus = visualStatuses[visualStep] ?? visualStatuses[0];
  const isRunning = !approved && !rejected && !timedOut && !errorText;

  async function handleBuyCredits() {
    try {
      setBuyingCredits(true);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pack_id: "starter",
          queue_id: queueId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.checkout_url) {
        throw new Error(data?.error || "Failed to start checkout.");
      }

      window.location.href = data.checkout_url as string;
    } catch (error) {
      console.error(error);
      setErrorText("Could not start credit checkout. Please try again.");
      setBuyingCredits(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          <span className="text-[#00FFC6]">Processing</span> your{" "}
          <span className="text-[#00FFC6]">track</span>
        </h1>

        {isRunning ? (
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-6 text-left shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl sm:p-7">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {activeVisualStatus}
                  </p>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
                    {statusText}
                  </p>
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

              <p className="mt-auto pt-6 text-center text-sm text-white/70 sm:text-[15px]">
                Do not close this page — your track is currently being processed.
              </p>
            </div>
          </div>
        ) : null}

        {timedOut && !approved && !rejected && (
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-6 text-left shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl sm:p-7">
            <div className="flex min-h-0 flex-1 flex-col text-center">
              <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Taking longer than expected.
              </p>

              <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                <button
                  type="button"
                  className="rounded-2xl border border-[#00FFC6]/60 bg-transparent px-6 py-3 font-semibold text-[#00FFC6] transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)]"
                  onClick={() => setRetryKey((k) => k + 1)}
                >
                  Retry Processing
                </button>

                <button
                  type="button"
                  className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05]"
                  onClick={() => router.replace("/artist/upload")}
                >
                  Back to Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {rejected && (
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-6 text-left shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl sm:p-7">
            {rejectReason === "duplicate_audio" || rejectReason === "duplicate" ? (
              <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
                <p className="mb-4 text-xl font-semibold tracking-tight text-white/95 sm:text-2xl">
                  This audio already exists on IMUSIC. Uploading it again is not allowed.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05]"
                    onClick={() => router.replace("/artist/upload")}
                  >
                    Back to Upload
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-[#00FFC6]/60 bg-transparent px-6 py-3 font-semibold text-[#00FFC6] transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)]"
                    onClick={() => router.replace("/artist/my-tracks")}
                  >
                    Go to My Tracks
                  </button>
                </div>
              </div>
            ) : credits >= 10 ? (
              <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
                <p className="mb-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Track <span className="text-red-400">rejected</span>. Detailed AI analysis is available for this upload.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05]"
                    onClick={() => router.replace("/artist/upload")}
                  >
                    Back to Upload
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border border-[#00FFC6]/60 bg-transparent px-6 py-3 font-semibold text-[#00FFC6] transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)]"
                    onClick={() => router.replace(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`)}
                  >
                    Detailed AI Analysis (10 Credits)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
                <p className="mb-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Track <span className="text-red-400">rejected</span>. Detailed AI analysis is available for this upload.
                </p>

                <p className="mt-3 text-base text-white/75 sm:text-lg">
                  Detailed AI analysis requires{" "}
                  <span className="font-semibold text-white/85">10 credits</span>.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05]"
                    onClick={() => router.replace("/artist/upload")}
                  >
                    Back to Upload
                  </button>

                  <button
                    type="button"
                    disabled={buyingCredits}
                    className="rounded-2xl border border-[#00FFC6]/60 bg-transparent px-6 py-3 font-semibold text-[#00FFC6] transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleBuyCredits}
                  >
                    {buyingCredits ? "Opening checkout..." : "Buy Credits"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {approved && (
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-6 text-left shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl sm:p-7">
            {credits >= 10 ? (
              <div className="flex min-h-0 flex-1 flex-col text-center">
                <p className="mb-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Track <span className="text-[#00FFC6]">approved</span>. You may publish.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05]"
                    onClick={() => router.replace("/artist/my-tracks")}
                  >
                    Go to My Tracks
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border border-[#00FFC6]/60 bg-transparent px-6 py-3 font-semibold text-[#00FFC6] transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)]"
                    onClick={() => router.push(`/artist/upload/feedback?queue_id=${encodeURIComponent(queueId)}`)}
                  >
                    Detailed AI Analysis (10 Credits)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col text-center">
                <p className="mb-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Track <span className="text-[#00FFC6]">approved</span>. You may publish.
                </p>

                <p className="mt-3 text-base text-white/75 sm:text-lg">
                  Detailed AI analysis requires{" "}
                  <span className="font-semibold text-white/85">10 credits</span>.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05]"
                    onClick={() => router.replace("/artist/my-tracks")}
                  >
                    Go to My Tracks
                  </button>

                  <button
                    type="button"
                    disabled={buyingCredits}
                    className="rounded-2xl border border-[#00FFC6]/60 bg-transparent px-6 py-3 font-semibold text-[#00FFC6] transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleBuyCredits}
                  >
                    {buyingCredits ? "Opening checkout..." : "Buy Credits"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {errorText && !isRunning && !approved && !rejected && !timedOut ? (
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-6 text-left shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl sm:p-7">
            <div className="flex min-h-0 flex-1 flex-col text-center">
              <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Processing <span className="text-red-400">failed</span>. Please try again.
              </p>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                We could not complete the next step for this track.
              </p>

              <div className="mt-auto flex justify-center pt-6">
                <button
                  type="button"
                  className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05]"
                  onClick={() => router.replace("/artist/upload")}
                >
                  Back to Upload
                </button>
              </div>
            </div>
          </div>
        ) : null}
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
