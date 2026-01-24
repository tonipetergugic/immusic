"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Music, MoreVertical, CheckCircle2, AlertCircle } from "lucide-react";
import { deleteTrackAction } from "./actions";

type Track = {
  id: string;
  title: string;
  version: string | null;
  audio_path: string;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  has_lyrics: boolean;
  is_explicit: boolean;
  artist_id: string;
  status: "approved" | "development" | "performance";
};

type TrackCardProps = {
  track: Track;
};

export function TrackCard({ track }: TrackCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const isComplete =
    Boolean(track?.version) &&
    Boolean(track?.bpm) &&
    Boolean(track?.key) &&
    Boolean(track?.genre) &&
    typeof track?.has_lyrics === "boolean" &&
    typeof track?.is_explicit === "boolean";
  const isIncomplete = !isComplete;

  return (
    <div
      className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06] hover:border-white/15"
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/artist/my-tracks/${track.id}/edit`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/artist/my-tracks/${track.id}/edit`);
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition group-hover:bg-white/8">
            <Music size={20} className="text-white/55" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {track.title}
              </div>

              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-white/70">
                {(track.version ?? "ORIGINAL").replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-0.5 truncate text-xs text-[#B3B3B3]">
              {[
                track.bpm ? `${track.bpm} BPM` : "— BPM",
                track.key ? track.key : "—",
                track.genre ? track.genre : "—",
              ].join(" • ")}
            </div>

            <div className="mt-1 truncate text-[11px] text-white/25">
              {track.audio_path}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-2">
          {isComplete ? (
            <div className="hidden sm:inline-flex min-w-[110px] items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold leading-none text-[#00FFC6]">
              Complete
            </div>
          ) : (
            <div className="hidden sm:inline-flex min-w-[110px] items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-semibold leading-none text-yellow-300">
              Incomplete
            </div>
          )}

          {/* Status pill */}
          <div className="hidden sm:inline-flex min-w-[110px] items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold leading-none text-white/80">
            {track.status === "approved"
              ? "Approved"
              : track.status === "development"
              ? "Development"
              : "Performance"}
          </div>

          {/* Menu button */}
          <button
            type="button"
            aria-label="Open track menu"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-white/70 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Track actions"
          className="absolute right-4 top-14 z-50 w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E10]/80 shadow-2xl backdrop-blur"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            role="menuitem"
            className="w-full px-4 py-3 text-left text-sm font-semibold text-white/85 transition hover:bg-white/[0.06]"
            onClick={() => {
              setOpen(false);
              router.push(`/artist/my-tracks/${track.id}/edit`);
            }}
          >
            Edit Track
          </button>

          <div className="h-px bg-white/10" />

          <button
            role="menuitem"
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-white/[0.06]"
            onClick={() => {
              setOpen(false);
              setShowDeleteModal(true);
            }}
          >
            Delete Track
          </button>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
          onClick={() => setShowDeleteModal(false)}
        >
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
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
                onClick={() => setShowDeleteModal(false)}
                disabled={isPending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 disabled:opacity-50"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    deleteTrackAction(track.id, track.audio_path);
                    setShowDeleteModal(false);
                  });
                }}
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

