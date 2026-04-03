"use client";

type DeleteTrackModalProps = {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteTrackModal({
  open,
  isPending,
  onClose,
  onConfirm,
}: DeleteTrackModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
      <div
        className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-[#0E0E10] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold text-white">Delete Track?</div>
        <p className="mt-2 text-sm text-white/60">
          Are you sure you want to delete this track? This cannot be undone.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition cursor-pointer hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
          type="button"
          className="inline-flex min-w-[140px] items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition cursor-pointer hover:bg-red-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={onConfirm}
        >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
