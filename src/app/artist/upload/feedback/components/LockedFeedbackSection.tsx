import React from "react";

type Props = {
  error: string;
  creditBalance: number;
  queueId: string;
  unlockPaidFeedbackAction: (formData: FormData) => Promise<void>;
};

export default function LockedFeedbackSection({
  error,
  creditBalance,
  queueId,
  unlockPaidFeedbackAction,
}: Props) {
  return (
    <div className="mt-6">
      <p className="text-white/70">
        Detailed AI feedback is locked. Unlock to view the full analysis for this upload.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-white/60">
          Credits: <span className="text-white font-semibold">{creditBalance}</span>
          <span className="text-white/30"> • </span>
          Unlock costs <span className="text-white font-semibold">1</span> credit
        </div>

        <form action={unlockPaidFeedbackAction}>
          <input type="hidden" name="queue_id" value={queueId} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-[#00FFC6] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00E0B0] transition"
          >
            Unlock AI Feedback
          </button>
        </form>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
