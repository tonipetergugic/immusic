"use client";

export default function DeleteCoverModal({
  open,
  busy = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0
        z-[999999]
        flex items-center justify-center
        bg-black/50 backdrop-blur-md
      "
      onClick={() => {
        if (busy) return;
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-[520px]
          rounded-2xl
          border border-white/10
          bg-white/[0.04]
          p-6
          text-white
          backdrop-blur-xl
          shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_25px_60px_rgba(0,0,0,0.65)]
        "
      >
        <h2 className="mb-2 text-[24px] font-semibold tracking-tight">
          Delete <span className="text-[#00FFC6]">Cover</span>
        </h2>

        <p className="mb-7 text-sm text-white/70">
          Are you sure you want to delete this cover? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="
              inline-flex min-w-[110px] cursor-pointer items-center justify-center
              rounded-xl border border-white/10
              px-5 py-2.5
              text-white/80
              transition
              hover:bg-white/10
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-white/30
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className="
              inline-flex min-w-[110px] cursor-pointer items-center justify-center
              rounded-xl border border-red-400/40
              bg-red-500/10
              px-5 py-2.5
              text-red-400
              transition
              hover:scale-[1.02] hover:border-red-400/70 hover:bg-red-500/25
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-red-400/40
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
