import Link from "next/link";

export default function UnlockPanel(props: {
  unlocked: boolean;
  error: string;
  creditBalance: number;
  queueId: string;
  unlockPaidFeedbackAction: (formData: FormData) => void;
}) {
  const { unlocked, error, creditBalance, queueId, unlockPaidFeedbackAction } = props;

  return (
    <>
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
            <form action={unlockPaidFeedbackAction}>
              <input type="hidden" name="queue_id" value={queueId} />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
              >
                Start detailed AI analysis
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
    </>
  );
}
