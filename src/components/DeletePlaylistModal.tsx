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
    <div
      className="
        fixed inset-0
        bg-black/50 backdrop-blur-md
        flex items-center justify-center
        z-[999999]
      "
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-[520px]
          rounded-2xl
          border border-white/10
          bg-white/[0.04]
          backdrop-blur-xl
          p-6
          shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_25px_60px_rgba(0,0,0,0.65)]
          text-white
        "
      >
        <h2 className="text-[24px] font-semibold tracking-tight mb-2">
          Delete <span className="text-[#00FFC6]">Playlist</span>
        </h2>
        <p className="text-sm text-white/70 mb-7">
          Are you sure you want to delete this playlist? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="
              inline-flex items-center justify-center cursor-pointer min-w-[110px]
              px-5 py-2.5
              rounded-xl
              border border-white/10
              text-white/80
              hover:bg-white/10
              transition
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-white/30
            "
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="
              inline-flex items-center justify-center cursor-pointer min-w-[110px]
              px-5 py-2.5
              rounded-xl
              border border-red-400/40
              text-red-400
              bg-red-500/10
              hover:bg-red-500/25
              hover:border-red-400/70
              transition hover:scale-[1.02]
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-red-400/40
            "
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

