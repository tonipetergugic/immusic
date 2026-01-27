"use client";

type DeleteReleaseModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void; // will be wired later
};

export default function DeleteReleaseModal({ open, onClose, onConfirm }: DeleteReleaseModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#1A1A1D] text-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-3">Delete Release</h2>
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this release? This action cannot be undone.
          The release and its cover will be removed, but your uploaded tracks will remain.
        </p>

        <div className="flex justify-end gap-3">
          {/* Cancel */}
          <button
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 backdrop-blur transition
    hover:bg-white/10 hover:border-white/25
    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Cancel
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
            }}
            className="rounded-xl border border-red-500/30 bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-300 backdrop-blur transition
    hover:bg-red-500/25 hover:border-red-500/50
    hover:shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_12px_40px_rgba(239,68,68,0.18)]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          >
            Delete Release
          </button>
        </div>
      </div>
    </div>
  );
}

