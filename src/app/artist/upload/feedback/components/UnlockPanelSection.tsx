"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";

export default function UnlockPanelSection(props: {
  error: string;
  creditBalance: number;
  queueId: string;
  unlockPaidFeedbackAction: (formData: FormData) => Promise<void>;
}) {
  const { error, creditBalance, queueId, unlockPaidFeedbackAction } = props;
  const [buyingCredits, setBuyingCredits] = useState(false);

  const hasCredits = creditBalance >= 10;
  const showMissingQueueId = error === "missing_queue_id";
  const showInsufficientCredits = error === "insufficient_credits" || creditBalance < 10;

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
      setBuyingCredits(false);
    }
  }

  return (
    <section className="flex min-h-[72vh] items-center justify-center">
      <div className="relative w-full max-w-[1080px] overflow-hidden rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_46%,rgba(255,255,255,0.02)_100%)] shadow-[0_28px_100px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-56 w-[34rem] -translate-x-1/2 rounded-full bg-[#00FFC6]/8 blur-3xl" />
          <div className="absolute -top-12 right-[-80px] h-48 w-48 rounded-full bg-white/[0.035] blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        </div>

        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              Detailed AI Feedback
            </p>

            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              <span className="text-[#00FFC6]">Unlock</span> the full analysis before opening{" "}
              <span className="text-[#00FFC6]">feedback</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/65 sm:text-[19px]">
              Detailed AI feedback is still locked for this upload. Unlock it with 10 credits or buy credits first.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[19px] text-white/55">
              <span>
                Your credits: <span className="font-semibold text-white">{creditBalance}</span>
              </span>
            </div>

            {showInsufficientCredits ? (
              <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                You need at least 10 credits to unlock this feedback.
              </div>
            ) : null}

            {showMissingQueueId ? (
              <div className="mx-auto mt-7 max-w-2xl rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                Missing queue_id.
              </div>
            ) : null}
          </div>

          <div className="mx-auto mt-10 grid w-full max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-[1.35fr_1fr]">
            {hasCredits ? (
              <form action={unlockPaidFeedbackAction} className="w-full">
                <input type="hidden" name="queue_id" value={queueId} />
                <button
                  type="submit"
                  disabled={showMissingQueueId}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#00FFC6]/55 bg-[#00FFC6]/10 px-4 text-[19px] font-semibold text-white shadow-[0_12px_30px_rgba(0,255,198,0.10)] transition duration-200 hover:-translate-y-0.5 hover:border-[#00FFC6]/80 hover:bg-[#00FFC6]/14 hover:shadow-[0_16px_36px_rgba(0,255,198,0.14)] cursor-pointer disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/40 disabled:shadow-none"
                >
                  <ArrowRight size={16} strokeWidth={2.5} className="text-[#00FFC6]" />
                  <span className="whitespace-nowrap">Unlock AI Feedback (10 Credits)</span>
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={handleBuyCredits}
                disabled={buyingCredits || showMissingQueueId}
                className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#00FFC6] bg-transparent px-4 text-[19px] font-semibold text-[#00FFC6] transition duration-200 hover:-translate-y-0.5 hover:bg-[#00FFC6]/10 hover:shadow-[0_16px_36px_rgba(0,255,198,0.16)] cursor-pointer disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/40 disabled:shadow-none"
              >
                <CreditCard
                  size={16}
                  strokeWidth={2.2}
                  className="text-[#00FFC6] transition duration-200"
                />
                <span>{buyingCredits ? "Opening checkout..." : "Buy Credits"}</span>
              </button>
            )}

              <Link
                href="/artist/my-tracks"
                className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.03] px-4 text-[19px] font-semibold text-white/95 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
            >
              Back to My Tracks
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
