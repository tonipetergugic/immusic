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
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              // no logic yet
              if (onConfirm) onConfirm();
            }}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 font-semibold transition"
          >
            Delete Release
          </button>
        </div>
      </div>
    </div>
  );
}

