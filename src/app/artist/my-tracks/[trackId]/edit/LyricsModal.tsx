"use client";

type LyricsModalProps = {
  open: boolean;
  value: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
};

export default function LyricsModal({
  open,
  value,
  draft,
  onDraftChange,
  onClose,
  onApply,
}: LyricsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-semibold text-white">
            {value.trim() ? "Edit lyrics" : "+ Add lyrics"}
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Line breaks will be preserved on the release page.
          </p>
        </div>

        <div className="px-6 py-5">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Paste or write your lyrics here..."
            className="min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white/80 transition cursor-pointer hover:bg-white/[0.06] hover:border-[#00FFC6]/40"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-[#00FFC6]/40 bg-[#00FFC6]/10 px-4 py-2.5 text-sm font-semibold text-[#00FFC6] transition cursor-pointer hover:bg-[#00FFC6]/15"
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
