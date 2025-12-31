"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Music, MoreVertical, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [newHasLyrics, setNewHasLyrics] = useState<boolean>(Boolean(track.has_lyrics));
  const [newIsExplicit, setNewIsExplicit] = useState<boolean>(Boolean(track.is_explicit));
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
        has_lyrics: newHasLyrics,
        is_explicit: newIsExplicit,
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

  const isComplete =
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
            {/* BPM / Key / Genre (secondary meta) */}
            <div className="text-sm text-[#B3B3B3] mt-0.5">
              {[
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
              setEditError(null);
              setNewTitle(track.title);
              setNewBpm(track.bpm ? String(track.bpm) : "");
              setNewKey(track.key ?? "");
              setNewGenre(track.genre ?? "");
              setNewHasLyrics(Boolean(track.has_lyrics));
              setNewIsExplicit(Boolean(track.is_explicit));
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditError(null);
              setShowRenameModal(false);
            }
          }}
        >
          <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.12em] text-white/60">Track</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Edit Track</h2>
                <p className="mt-1 text-sm text-white/60">
                  Update metadata used for releases and discovery.
                </p>
              </div>
            </div>
            <input
              type="text"
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={100}
              placeholder="Track title"
            />
            {/* BPM + Key */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.12em] text-white/60 mb-2">BPM</label>
                <input
                  inputMode="numeric"
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
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
                <label className="block text-xs uppercase tracking-[0.12em] text-white/60 mb-2">Key</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
                  value={newKey}
                  list="key-suggestions"
                  maxLength={3}
                  onChange={(e) => setNewKey(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g. Dm"
                />
              </div>
            </div>
            <div className="mt-5">
              <label className="block text-xs uppercase tracking-[0.12em] text-white/60 mb-2">Genre</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
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
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white/90">Contains lyrics</div>
                  <div className="mt-0.5 text-xs text-white/60">Mark instrumental tracks as off.</div>
                </div>
                <input
                  type="checkbox"
                  checked={newHasLyrics}
                  onChange={(e) => setNewHasLyrics(e.target.checked)}
                  className="h-5 w-5 accent-[#00FFC6]"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white/90">Explicit content</div>
                  <div className="mt-0.5 text-xs text-white/60">Enable if the track is explicit.</div>
                </div>
                <input
                  type="checkbox"
                  checked={newIsExplicit}
                  onChange={(e) => setNewIsExplicit(e.target.checked)}
                  className="h-5 w-5 accent-[#00FFC6]"
                />
              </label>
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
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {editError}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
                onClick={() => {
                  setEditError(null);
                  setShowRenameModal(false);
                }}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] hover:border-[#00FFC6]/60 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
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

