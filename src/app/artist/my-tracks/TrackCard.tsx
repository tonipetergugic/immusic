"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Music, MoreVertical } from "lucide-react";
import { deleteTrackAction, renameTrackAction } from "./actions";

type TrackCardProps = {
  track: any;
};

export function TrackCard({ track }: TrackCardProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newTitle, setNewTitle] = useState(track.title);
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

  return (
    <div className="relative bg-white/5 hover:bg-white/10 rounded-lg p-4 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music size={20} className="text-white/50" />
          <div className="flex flex-col">
            <div className="text-white text-sm font-medium">{track.title}</div>
            <div className="text-white/50 text-xs">{track.audio_path}</div>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white/60 hover:text-white"
        >
          <MoreVertical size={18} />
        </button>
      </div>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-4 top-10 bg-[#1A1A1C] border border-white/10 rounded-md shadow-lg text-sm flex flex-col z-50"
        >
          <button
            className="px-4 py-2 text-left text-white/80 hover:bg-white/5"
            onClick={() => {
              setShowRenameModal(true);
              setOpen(false);
            }}
          >
            Rename Track
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
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1C] border border-white/10 rounded-lg p-6 w-80">
            <h2 className="text-white text-lg font-semibold mb-2">Rename Track</h2>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white mb-4"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20"
                onClick={() => setShowRenameModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    renameTrackAction(track.id, newTitle);
                    setShowRenameModal(false);
                  });
                }}
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
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

