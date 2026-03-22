"use client";

type TrackActionsSectionProps = {
  editError: string | null;
  editSuccess: string | null;
  isPending: boolean;
  queueId: string | null;
  onSave: () => void;
  onDone: () => void;
  onViewFeedback: () => void;
  onDelete: () => void;
};

export default function TrackActionsSection({
  editError,
  editSuccess,
  isPending,
  queueId,
  onSave,
  onDone,
  onViewFeedback,
  onDelete,
}: TrackActionsSectionProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 xl:mt-auto">
      <div>
        <div className="text-[1.125rem] font-semibold uppercase tracking-[0.12em] text-[#00FFC6]">
          Actions
        </div>
        <div className="mt-1 text-sm text-white/45">
          Save changes, review feedback, or manage this track.
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {editError && (
          <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {editError}
          </div>
        )}
        {editSuccess && (
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
            {editSuccess}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-[#00FFC6]/35 bg-[#00FFC6]/12 px-4 py-3 text-sm font-semibold text-[#00FFC6] transition cursor-pointer hover:bg-[#00FFC6]/16 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          disabled={isPending}
          onClick={onSave}
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          className="rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/82 transition cursor-pointer hover:bg-white/[0.06] hover:border-[#00FFC6]/40"
          onClick={onDone}
        >
          Done
        </button>

        {queueId && (
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/78 transition cursor-pointer hover:bg-white/[0.06] hover:border-[#00FFC6]/40"
            onClick={onViewFeedback}
          >
            View Feedback
          </button>
        )}

        <div className="mt-2 border-t border-white/10 pt-4">
          <button
            type="button"
            className="w-full rounded-xl border border-red-400/15 bg-red-400/8 px-4 py-3 text-sm font-semibold text-red-200/90 transition cursor-pointer hover:bg-red-400/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
            onClick={onDelete}
          >
            Delete Track
          </button>
        </div>
      </div>
    </section>
  );
}
