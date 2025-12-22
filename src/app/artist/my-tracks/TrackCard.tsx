"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Music, MoreVertical } from "lucide-react";
import {
  deleteTrackAction,
  renameTrackAction,
  type RenameTrackPayload,
} from "./actions";

type TrackCardProps = {
  track: any;
};

export function TrackCard({ track }: TrackCardProps) {
  const router = useRouter();
  const ALLOWED_KEYS = new Set([
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
    "Cm",
    "C#m",
    "Dm",
    "D#m",
    "Em",
    "Fm",
    "F#m",
    "Gm",
    "G#m",
    "Am",
    "A#m",
    "Bm",
  ]);
  const [open, setOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newTitle, setNewTitle] = useState(track.title);
  const [newBpm, setNewBpm] = useState<string>(track.bpm ? String(track.bpm) : "");
  const [newKey, setNewKey] = useState<string>(track.key ?? "");
  const [newGenre, setNewGenre] = useState<string>(track.genre ?? "");
  const [editError, setEditError] = useState<string | null>(null);
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

  const handleSaveEdit = () => {
    startTransition(async () => {
      const titleValue = newTitle.trim();
      if (titleValue.length === 0) {
        setEditError("Title cannot be empty.");
        return;
      }

      // validate BPM
      let bpmValue: number | null = null;
      if (newBpm !== "") {
        const parsed = Number.parseInt(newBpm, 10);
        if (Number.isNaN(parsed) || parsed < 40 || parsed > 300) {
          setEditError("BPM must be between 40 and 300.");
          return;
        }
        bpmValue = parsed;
      }

      // validate Key
      const trimmedKey = newKey.trim();
      let keyValue: string | null = null;
      if (trimmedKey !== "") {
        if (!ALLOWED_KEYS.has(trimmedKey)) {
          setEditError("Key must be a valid Ableton key (e.g. F#m, Dm).");
          return;
        }
        keyValue = trimmedKey;
      }

      setEditError(null);
      const payload: RenameTrackPayload = {
        title: titleValue,
        bpm: bpmValue,
        key: keyValue,
        genre: newGenre.trim() === "" ? null : newGenre.trim(),
      };
      await renameTrackAction(track.id, payload);
      router.refresh();
      setShowRenameModal(false);
    });
  };

  useEffect(() => {
    if (!showRenameModal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditError(null);
        setShowRenameModal(false);
        return;
      }

      if (event.key === "Enter" && !isPending) {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "TEXTAREA" || target.tagName === "BUTTON")) {
          return;
        }
        handleSaveEdit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showRenameModal, isPending, handleSaveEdit]);

  return (
    <div className="relative bg-white/5 hover:bg-white/10 rounded-lg p-4 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Music size={20} className="text-white/50" />
          <div className="flex flex-col">
            <div className="text-white text-sm font-medium">{track.title}</div>
            {/* BPM / Key / Genre (secondary meta) */}
            {(track.bpm || track.key || track.genre) && (
              <div className="text-sm text-[#B3B3B3] mt-0.5">
                {[track.bpm ? `${track.bpm} BPM` : null, track.key ?? null, track.genre ?? null]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            )}
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
              setEditError(null);
              setShowRenameModal(true);
              setOpen(false);
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
      {showRenameModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditError(null);
              setShowRenameModal(false);
            }
          }}
        >
          <div className="bg-[#1A1A1C] border border-white/10 rounded-lg p-6 w-80">
            <h2 className="text-white text-lg font-semibold mb-2">Edit Track</h2>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white mb-4"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={100}
            />
            {/* BPM + Key */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-white/60 mb-1">BPM</label>
                <input
                  inputMode="numeric"
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none"
                  value={newBpm}
                  list="bpm-suggestions"
                  maxLength={3}
                  onChange={(e) => {
                    // nur Ziffern zulassen (UI-only)
                    const next = e.target.value.replace(/[^\d]/g, "");
                    setNewBpm(next);
                  }}
                  placeholder="e.g. 138"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">Key</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none"
                  value={newKey}
                  list="key-suggestions"
                  maxLength={3}
                  onChange={(e) => setNewKey(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g. Dm"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-white/60 mb-1">Genre</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
              >
                <option value="">Select genre</option>
                <option value="Trance">Trance</option>
                <option value="Progressive Trance">Progressive Trance</option>
                <option value="Uplifting Trance">Uplifting Trance</option>
                <option value="Tech Trance">Tech Trance</option>
                <option value="Progressive House">Progressive House</option>
                <option value="Techno">Techno</option>
                <option value="Melodic Techno">Melodic Techno</option>
                <option value="House">House</option>
                <option value="EDM">EDM</option>
                <option value="Hardstyle">Hardstyle</option>
                <option value="Drum & Bass">Drum & Bass</option>
              </select>
            </div>
            <datalist id="bpm-suggestions">
              <option value="120" />
              <option value="124" />
              <option value="128" />
              <option value="130" />
              <option value="132" />
              <option value="134" />
              <option value="136" />
              <option value="138" />
              <option value="140" />
              <option value="142" />
              <option value="144" />
            </datalist>
            <datalist id="key-suggestions">
              <option value="C" />
              <option value="C#" />
              <option value="D" />
              <option value="D#" />
              <option value="E" />
              <option value="F" />
              <option value="F#" />
              <option value="G" />
              <option value="G#" />
              <option value="A" />
              <option value="A#" />
              <option value="B" />
              <option value="Cm" />
              <option value="C#m" />
              <option value="Dm" />
              <option value="D#m" />
              <option value="Em" />
              <option value="Fm" />
              <option value="F#m" />
              <option value="Gm" />
              <option value="G#m" />
              <option value="Am" />
              <option value="A#m" />
              <option value="Bm" />
            </datalist>
            {editError && (
              <div className="mb-3 text-sm text-red-400">{editError}</div>
            )}
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  setEditError(null);
                  setShowRenameModal(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                disabled={isPending}
                onClick={handleSaveEdit}
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

