"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Music, MoreVertical, Check, AlertTriangle } from "lucide-react";
import { deleteTrackAction } from "./actions";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

type Track = {
  id: string;
  title: string;
  version: string | null;
  audio_path: string;
  queue_id?: string | null;
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

  const isLocked = Boolean((track as any).isLocked);

  return (
    <div
      className={"group relative w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-[#00FFC6]/30 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_0_18px_rgba(0,255,198,0.12)]" + (isLocked ? " opacity-55 cursor-not-allowed hover:shadow-none hover:border-white/10" : "")}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isLocked) return;
        router.push(`/artist/my-tracks/${track.id}/edit`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isLocked) return;
          router.push(`/artist/my-tracks/${track.id}/edit`);
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10">
            <Music size={20} className="text-white/55" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {formatTrackTitle(track.title, track.version)}
              </div>
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
          {/* Status pill */}
          <div className="hidden sm:inline-flex min-w-[110px] items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/75">
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
            disabled={isLocked}
            onClick={(e) => {
              e.stopPropagation();
              if (isLocked) return;
              setOpen((v) => !v);
            }}
            className={"inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] p-2 text-white/70 hover:bg-white/[0.05] hover:text-white/85 active:scale-[0.98] transition" + (isLocked ? " opacity-40 pointer-events-none" : "")}
          >
            <MoreVertical size={18} />
          </button>

          {isComplete ? (
            <div
              className="hidden sm:inline-flex items-center justify-center ml-3 text-[#00FFC6] drop-shadow-[0_0_6px_rgba(0,255,198,0.65)]"
              aria-label="Complete"
              title="Complete"
            >
              <Check size={26} strokeWidth={2.8} />
            </div>
          ) : (
            <div
              className="hidden sm:inline-flex items-center justify-center ml-3 text-amber-300"
              aria-label="Incomplete"
              title="Incomplete"
            >
              <AlertTriangle size={26} />
            </div>
          )}
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
              if (isLocked) return;
              setOpen(false);
              router.push(`/artist/my-tracks/${track.id}/edit`);
            }}
          >
            Edit Track
          </button>

          <div className="h-px bg-white/10" />

          <button
            role="menuitem"
            disabled={!track.queue_id}
            className={
              "w-full px-4 py-3 text-left text-sm font-semibold transition hover:bg-white/[0.06] " +
              (track.queue_id ? "text-white/85" : "text-white/35 cursor-not-allowed")
            }
            onClick={() => {
              if (isLocked) return;
              if (!track.queue_id) return;
              setOpen(false);
              router.push(
                `/artist/upload/feedback?queue_id=${encodeURIComponent(track.queue_id)}`
              );
            }}
          >
            View Feedback
          </button>

          <div className="h-px bg-white/10" />

          <button
            role="menuitem"
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-white/[0.06]"
            onClick={() => {
              if (isLocked) return;
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
                  if (isLocked) return;
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

