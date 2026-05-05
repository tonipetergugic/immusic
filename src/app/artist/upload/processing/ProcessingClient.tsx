"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { unlockPaidFeedbackAction } from "../feedback/actions";

type QueueStatusResponse =
  | { ok: true; processed: true; decision: "approved"; feedback_available?: boolean; queue_id: string }
  | { ok: true; processed: true; decision: "rejected"; reason?: string; feedback_available?: boolean; queue_id: string }
  | { ok: true; processed: false; reason: "queued" | "processing"; queue_id: string }
  | { ok: false; error: string };

type ProcessNextResponse =
  | { ok: true; processed: false; reason: "processing_in_progress"; queue_id: string }
  | {
      ok: true;
      processed: true;
      decision: "approved";
      feedback_available?: boolean;
      queue_id: string;
    }
  | {
      ok: true;
      processed: true;
      decision: "rejected";
      reason?: string;
      feedback_available?: boolean;
      queue_id: string;
    }
  | { ok: false; error: string };

type Props = { credits: number; queueId: string };

function isDuplicateRejectReason(reason: string | null | undefined): boolean {
  return reason === "duplicate_audio" || reason === "duplicate";
}

export default function ProcessingClient({ credits, queueId }: Props) {
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [approved, setApproved] = useState(false);
  const [canFeedback, setCanFeedback] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [runningUiState, setRunningUiState] = useState<"queued" | "running">("queued");
  const [visualStep, setVisualStep] = useState(0);
  const [buyingCredits, setBuyingCredits] = useState(false);

  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const kickoffInFlightRef = useRef(false);
  const transientFailureCountRef = useRef(0);
  const pollModeRef = useRef<"queued" | "processing">("queued");

  useEffect(() => {
    const QUEUED_POLL_MS = 5000;
    const PROCESSING_POLL_MS = 15000;
    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
    const MAX_TRANSIENT_FAILURES = 3;

    function scheduleNextPoll() {
      const delay =
        pollModeRef.current === "processing" ? PROCESSING_POLL_MS : QUEUED_POLL_MS;

      timerRef.current = window.setTimeout(tick, delay);
    }

    let cancelled = false;

    // Reset UI states for a fresh run (triggered by first mount or Retry Processing)
    setTimedOut(false);
    setErrorText(null);
    setRejected(false);
    setApproved(false);
    setCanFeedback(false);
    setRejectReason(null);
    setRunningUiState("queued");
    setVisualStep(0);
    kickoffInFlightRef.current = false;
    transientFailureCountRef.current = 0;
    pollModeRef.current = "queued";

    startedAtRef.current = Date.now();

    async function tick() {
      try {
        if (cancelled) return;

        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed >= TIMEOUT_MS) {
          setTimedOut(true);
          return;
        }
        const statusRes = await fetch(
          `/api/ai/track-check/status?queue_id=${encodeURIComponent(queueId)}`,
          { cache: "no-store" },
        );
        const statusData = (await statusRes.json()) as QueueStatusResponse;

        if (cancelled) return;

        if (!statusRes.ok || !("ok" in statusData) || statusData.ok !== true) {
          transientFailureCountRef.current += 1;

          if (transientFailureCountRef.current < MAX_TRANSIENT_FAILURES) {
            scheduleNextPoll();
            return;
          }

          setErrorText("Processing failed. Please try again.");
          return;
        }

        if (statusData.queue_id !== queueId) {
          setErrorText("Processing failed. Please reload the page.");
          return;
        }

        transientFailureCountRef.current = 0;

        if (statusData.processed) {
          if (statusData.decision === "approved") {
            router.replace(`/decision-center-lab?queue_id=${encodeURIComponent(queueId)}`);
            return;
          }

          const reason = statusData.reason ?? null;

          if (isDuplicateRejectReason(reason)) {
            setRejected(true);
            setRejectReason(reason);
            return;
          }

          router.replace(`/decision-center-lab?queue_id=${encodeURIComponent(queueId)}`);
          return;
        }

        if (statusData.reason === "processing") {
          pollModeRef.current = "processing";
          setRunningUiState("running");
          scheduleNextPoll();
          return;
        }

        setRunningUiState((current) => (current === "running" ? "running" : "queued"));
        pollModeRef.current = "queued";

        if (!kickoffInFlightRef.current) {
          kickoffInFlightRef.current = true;

          void fetch("/api/ai/track-check/process-next", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              queue_id: queueId,
            }),
          })
            .then(async (res) => {
              let data: ProcessNextResponse | null = null;

              try {
                data = (await res.json()) as ProcessNextResponse;
              } catch {
                return;
              }

              if (cancelled || !data || !("queue_id" in data) || data.queue_id !== queueId) {
                return;
              }

              if (data.ok !== true) {
                return;
              }

              if (data.processed) {
                if (data.decision === "approved") {
                  router.replace(`/decision-center-lab?queue_id=${encodeURIComponent(queueId)}`);
                  return;
                }

                const reason = data.reason ?? null;

                if (isDuplicateRejectReason(reason)) {
                  setRejected(true);
                  setRejectReason(reason);
                  return;
                }

                router.replace(`/decision-center-lab?queue_id=${encodeURIComponent(queueId)}`);
                return;
              }

              if (data.reason === "processing_in_progress") {
                pollModeRef.current = "processing";
                setRunningUiState("running");
              }
            })
            .catch(() => {
              // best-effort trigger only
            })
            .finally(() => {
              kickoffInFlightRef.current = false;
            });
        }

        if (cancelled) return;
        scheduleNextPoll();
      } catch {
        if (cancelled) return;

        transientFailureCountRef.current += 1;

        if (transientFailureCountRef.current < MAX_TRANSIENT_FAILURES) {
          scheduleNextPoll();
          return;
        }

        setErrorText("Processing failed. Please reload the page.");
      }
    }

    tick();

    return () => {
      cancelled = true;
      kickoffInFlightRef.current = false;
      transientFailureCountRef.current = 0;
      pollModeRef.current = "queued";
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [retryKey, queueId, router]);

  useEffect(() => {
    if (runningUiState !== "running" || approved || rejected || timedOut || errorText) {
      setVisualStep(0);
      return;
    }

    setVisualStep(0);

    const step1Timer = window.setTimeout(() => {
      setVisualStep(1);
    }, 7000);

    const step2Timer = window.setTimeout(() => {
      setVisualStep(2);
    }, 15000);

    return () => {
      window.clearTimeout(step1Timer);
      window.clearTimeout(step2Timer);
    };
  }, [runningUiState, approved, rejected, timedOut, errorText, retryKey]);

  const runningVisualStatuses = [
    "Preparing analysis…",
    "Checking audio quality…",
    "Inspecting technical details…",
  ];

  const activeVisualStatus =
    runningUiState === "queued"
      ? "Queued for processing…"
      : runningVisualStatuses[visualStep] ??
        runningVisualStatuses[runningVisualStatuses.length - 1];
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

  const showRecoverableState = (timedOut || !!errorText) && !approved && !rejected;

  const recoverableTitle = timedOut
    ? "Taking longer than expected."
    : "Processing was temporarily interrupted.";

  const recoverableDescription = timedOut
    ? "Processing may still be running in the background. You can retry processing or return to upload."
    : "We could not continue tracking this upload right now. You can retry processing or return to upload.";

  return (
    <div className="min-h-screen bg-[#0E0E10] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          <span className="text-[#00FFC6]">Processing</span> your{" "}
          <span className="text-[#00FFC6]">track</span>
        </h1>

        {isRunning ? (
          <div className="flex h-[235px] w-full shrink-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-5 text-left shadow-[0_26px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/5 backdrop-blur-xl sm:p-6">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-[19px] font-semibold tracking-tight text-white sm:text-[22px]">
                    {activeVisualStatus}
                  </p>
                </div>

                <div className="relative mt-0.5 h-5 w-5 shrink-0">
                  <span className="absolute inset-0 rounded-full border border-white/15" />
                  <span className="absolute inset-0 rounded-full bg-[#00FFC6]/20 blur-[6px]" />
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#00FFC6]/25" />
                  <span className="absolute inset-[4px] rounded-full bg-[#00FFC6]" />
                </div>
              </div>

              <div className="mt-6">
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="processing-bar h-full w-1/3 rounded-full bg-[#00FFC6]" />
                </div>
              </div>

              <p className="mt-auto pt-5 text-center text-[18px] text-white/70">
                Do not close this page — your track is currently being processed.
              </p>
            </div>
          </div>
        ) : null}

        {showRecoverableState ? (
          <div className="flex h-[235px] w-full shrink-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-5 text-left shadow-[0_26px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/5 backdrop-blur-xl sm:p-6">
            <div className="flex min-h-0 flex-1 flex-col text-center">
              <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {recoverableTitle}
              </p>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                {recoverableDescription}
              </p>

              <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                <button
                  type="button"
                  className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
                  onClick={() => setRetryKey((k) => k + 1)}
                >
                  Retry Processing
                </button>

                <button
                  type="button"
                  className="min-w-[132px] whitespace-normal text-center leading-tight rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
                  onClick={() => router.replace("/artist/upload")}
                >
                  Back to Upload
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {rejected && (
          <div className="flex h-[235px] w-full shrink-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-5 text-left shadow-[0_26px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/5 backdrop-blur-xl sm:p-6">
            {rejectReason === "duplicate_audio" || rejectReason === "duplicate" ? (
              <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
                <p className="mb-4 text-xl font-semibold tracking-tight text-white/95 sm:text-2xl">
                  This audio already exists on IMUSIC. Uploading it again is not allowed.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="min-w-[132px] whitespace-normal text-center leading-tight rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
                    onClick={() => router.replace("/artist/upload")}
                  >
                    Back to Upload
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
                    onClick={() => router.replace("/artist/my-tracks")}
                  >
                    Go to My Tracks
                  </button>
                </div>
              </div>
            ) : credits >= 10 ? (
              <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
                <p className="mb-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Track <span className="text-red-400">rejected</span>. AI analysis is available for this upload.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="min-w-[132px] whitespace-normal text-center leading-tight rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
                    onClick={() => router.replace("/artist/upload")}
                  >
                    Back to Upload
                  </button>

                  <form action={unlockPaidFeedbackAction} className="contents">
                    <input type="hidden" name="queue_id" value={queueId} />
                    <button
                      type="submit"
                      className="shrink-0 whitespace-nowrap rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
                    >
                      Detailed AI Analysis (10 Credits)
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
                <p className="mb-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Track <span className="text-red-400">rejected</span>. AI analysis is available for this upload.
                </p>

                <p className="mt-3 text-base text-white/75 sm:text-lg">
                  Detailed AI analysis requires{" "}
                  <span className="font-semibold text-white/85">10 credits</span>.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="min-w-[132px] whitespace-normal text-center leading-tight rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
                    onClick={() => router.replace("/artist/upload")}
                  >
                    Back to Upload
                  </button>

                  <button
                    type="button"
                    disabled={buyingCredits}
                    className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="flex h-[235px] w-full shrink-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-5 text-left shadow-[0_26px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/5 backdrop-blur-xl sm:p-6">
            {credits >= 10 ? (
              <div className="flex min-h-0 flex-1 flex-col text-center">
                <p className="mb-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Track <span className="text-[#00FFC6]">approved</span>. You may publish.
                </p>

                <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
                  <button
                    type="button"
                    className="min-w-[132px] whitespace-normal text-center leading-tight rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
                    onClick={() => router.replace("/artist/my-tracks")}
                  >
                    Go to My Tracks
                  </button>

                  <form action={unlockPaidFeedbackAction} className="contents">
                    <input type="hidden" name="queue_id" value={queueId} />
                    <button
                      type="submit"
                      className="shrink-0 whitespace-nowrap rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
                    >
                      Detailed AI Analysis (10 Credits)
                    </button>
                  </form>
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
                    className="min-w-[132px] whitespace-normal text-center leading-tight rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
                    onClick={() => router.replace("/artist/my-tracks")}
                  >
                    Go to My Tracks
                  </button>

                  <button
                    type="button"
                    disabled={buyingCredits}
                    className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleBuyCredits}
                  >
                    {buyingCredits ? "Opening checkout..." : "Buy Credits"}
                  </button>
                </div>
              </div>
            )}
          </div>
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
