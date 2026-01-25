"use client";

import { Music } from "lucide-react";

export default function PlaylistEmptyState({
  isOwner,
  onAddTrack,
}: {
  isOwner: boolean;
  onAddTrack: () => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-900 bg-neutral-950/30 p-8">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00FFC633] bg-[#00FFC60A]">
          <Music size={22} className="text-[#00FFC6]" />
        </div>

        <h3 className="text-lg font-semibold text-white">
          {isOwner ? "This playlist is empty" : "No tracks yet"}
        </h3>

        <p className="text-sm text-white/60 max-w-md">
          {isOwner
            ? "Add your first track to get started."
            : "This playlist doesn't have any tracks yet."}
        </p>

        {isOwner ? (
          <button
            type="button"
            onClick={onAddTrack}
            className="
              mt-2 inline-flex items-center justify-center gap-2
              h-11 px-5 rounded-full
              bg-[#0E0E10] border border-[#00FFC633]
              text-[#00FFC6] text-sm font-semibold
              hover:border-[#00FFC666]
              hover:bg-[#00FFC60F]
              transition
            "
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14m7-7H5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add your first track
          </button>
        ) : null}
      </div>
    </div>
  );
}
