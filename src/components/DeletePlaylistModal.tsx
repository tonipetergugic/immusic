"use client";

export default function DeletePlaylistModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999999] backdrop-blur-sm bg-black/60 flex items-center justify-center">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full text-white shadow-2xl">
        <h2 className="text-xl font-semibold mb-2">Delete Playlist</h2>
        <p className="text-sm text-white/70 mb-6">
          Are you sure you want to delete this playlist? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

