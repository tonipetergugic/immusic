"use client";

type TrackActionsSectionProps = {
  editError: string | null;
  editSuccess: string | null;
  isPending: boolean;
  isLocked: boolean;
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
  isLocked,
  queueId,
  onSave,
  onDone,
  onViewFeedback,
  onDelete,
}: TrackActionsSectionProps) {
  return (
    <section className="border-b border-white/10 pb-12">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#B3B3B3]">
          Actions
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Track actions
        </div>
        <div className="mt-3 text-[15px] leading-7 text-[#B3B3B3]">
          Manage this track and its visibility.
        </div>
      </div>

      <div className="mt-8 min-h-[28px]">
        {editError ? (
          <div className="text-sm text-red-300">{editError}</div>
        ) : editSuccess ? (
          <div className="text-sm text-emerald-300">{editSuccess}</div>
        ) : (
          <div aria-hidden="true" className="h-[24px]" />
        )}
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#00FFC6]/35 bg-[#00FFC6]/10 px-4 py-3 text-sm font-semibold text-[#00FFC6] transition cursor-pointer hover:border-[#00FFC6]/55 hover:bg-[#00FFC6]/14 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          disabled={isPending || isLocked}
          onClick={onSave}
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>

        <button
          type="button"
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/82 transition cursor-pointer hover:border-white/20 hover:bg-white/[0.04]"
          onClick={onDone}
        >
          Done
        </button>

        {queueId ? (
          <button
            type="button"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/72 transition cursor-pointer hover:border-[#00FFC6]/35 hover:bg-white/[0.03] hover:text-white"
            onClick={onViewFeedback}
          >
            View feedback
          </button>
        ) : null}

        <div className="pt-6">
          <div className="border-t border-white/10 pt-6">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Danger zone
            </div>

            <button
              type="button"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-red-400/18 bg-transparent px-4 py-3 text-sm font-semibold text-red-200/90 transition cursor-pointer hover:border-red-400/30 hover:bg-red-400/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLocked}
              onClick={onDelete}
            >
              Delete track
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
