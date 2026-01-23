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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
    <div className="relative bg-white/5 hover:bg-white/10 rounded-lg p-4 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music size={20} className="text-white/50" />
          <div className="flex flex-col">
            <div className="text-white text-sm font-medium">{track.title}</div>
            {/* Version / BPM / Key / Genre (secondary meta) */}
            <div className="text-sm text-[#B3B3B3] mt-0.5">
              {[
                (track.version ?? "ORIGINAL").replaceAll("_", " "),
                track.bpm ? `${track.bpm} BPM` : "— BPM",
                track.key ? track.key : "—",
                track.genre ? track.genre : "—",
              ].join(" • ")}
            </div>
            <div className="text-white/50 text-xs">{track.audio_path}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isComplete && (
            <div className="relative group">
              <CheckCircle2
                size={20}
                strokeWidth={2.5}
                className="text-emerald-400"
                aria-label="Track ready for release"
              />
              <div
                className="
      pointer-events-none
      absolute right-1/2 top-1/2 -translate-y-1/2 translate-x-full
      ml-2
      opacity-0 group-hover:opacity-100
      transition
      whitespace-nowrap
      rounded-md
      bg-black/90
      px-2.5 py-1.5
      text-xs text-white
    "
              >
                Track ready for release
              </div>
            </div>
          )}

          {isIncomplete && (
            <div className="relative group">
              <AlertCircle
                size={20}
                strokeWidth={2.5}
                className="text-yellow-400"
                aria-label="Metadata incomplete"
              />
              <div
                className="
      pointer-events-none
      absolute right-1/2 top-1/2 -translate-y-1/2 translate-x-full
      ml-2
      opacity-0 group-hover:opacity-100
      transition
      whitespace-nowrap
      rounded-md
      bg-black/90
      px-2.5 py-1.5
      text-xs text-white
    "
              >
                Please add BPM, key and genre
              </div>
            </div>
          )}

          <button
            onClick={() => setOpen(!open)}
            className="text-white/60 hover:text-white"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-4 top-10 bg-[#1A1A1C] border border-white/10 rounded-md shadow-lg text-sm flex flex-col z-50"
        >
          <button
            className="px-4 py-2 text-left text-white/80 hover:bg-white/5"
            onClick={() => {
              setOpen(false);
              router.push(`/artist/my-tracks/${track.id}/edit`);
            }}
          >
            Edit Track
          </button>
          <button
            className="px-4 py-2 text-left text-red-400 hover:bg-white/5"
            onClick={() => {
              setOpen(false);
              setShowDeleteModal(true);
            }}
          >
            Delete Track
          </button>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1C] border border-white/10 rounded-lg p-6 w-80 text-center">
            <h2 className="text-white text-lg font-semibold mb-2">Delete Track?</h2>
            <p className="text-white/60 text-sm mb-4">
              Are you sure you want to delete this track?
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-500/80 hover:bg-red-500 text-white disabled:opacity-50"
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

