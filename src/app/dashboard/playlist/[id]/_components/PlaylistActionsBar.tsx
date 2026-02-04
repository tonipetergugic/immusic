"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Playlist } from "@/types/database";
import PlayOverlayButton from "@/components/PlayOverlayButton";

type PlayerTrack = {
  id: string;
  title: string;
  artist_id: string;
  cover_url: string | null;
  audio_url: string;
};

export default function PlaylistActionsBar({
  isOwner,
  playlist,
  user,
  isSavedToLibrary,
  saveBusy,
  tracks,
  startIndex = 0,
  onAddTrack,
  onToggleSaveToLibrary,
  onTogglePublic,
  onDeletePlaylist,
  onEditDetails,
}: {
  isOwner: boolean;
  playlist: Playlist;
  user: any | null;

  isSavedToLibrary: boolean;
  saveBusy: boolean;
  tracks?: PlayerTrack[];
  startIndex?: number;

  onAddTrack: () => void;
  onToggleSaveToLibrary: () => void;

  onTogglePublic: () => Promise<void>;
  onDeletePlaylist: () => void;
  onEditDetails: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!menuOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [menuOpen]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-6">
        {/* PLAY (standard) */}
        {tracks && tracks.length > 0 ? (
          <PlayOverlayButton
            variant="standalone"
            size="lg"
            track={tracks[Math.max(0, startIndex)]}
            tracks={tracks}
            index={Math.max(0, startIndex)}
          />
        ) : (
          <button
            type="button"
            disabled
            className="
              inline-flex items-center gap-2
              px-5 h-10
              rounded-full
              border border-[#00FFC6]/25
              text-[#00FFC6]/40
              cursor-not-allowed
            "
          >
            <span>Play</span>
          </button>
        )}

        {/* SECONDARY ACTIONS */}
        {isOwner ? (
          <div className="flex items-center gap-4">
            {/* ADD TRACK */}
            <button
              onClick={onAddTrack}
              aria-label="Add track"
              title="Add track"
              className="
    inline-flex items-center justify-center
    w-9 h-9
    text-[#00FFC6]
    hover:text-[#00E0B0]
    transition
    align-middle
  "
            >
              <span className="inline-flex items-center justify-center w-9 h-9 leading-none">
                <Plus size={28} className="relative top-[1px]" />
              </span>
            </button>

            {/* SETTINGS MENU */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Playlist settings"
                title="Playlist settings"
                className="
    inline-flex items-center justify-center
    w-9 h-9
    text-[#00FFC6]
    hover:text-[#00E0B0]
    transition
    align-middle
  "
              >
                <span className="inline-flex items-center justify-center w-9 h-9 leading-none">
                  <MoreHorizontal size={28} className="relative top-[0px]" />
                </span>
              </button>

              {menuOpen ? (
                <div
                  className="
        absolute left-full ml-2 top-1/2 -translate-y-1/2
        min-w-[180px]
        rounded-xl border border-white/10
        bg-[#0E0E10]/95 backdrop-blur
        shadow-[0_12px_40px_rgba(0,0,0,0.55)]
        overflow-hidden
        z-50
      "
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditDetails();
                    }}
                    className="
          w-full px-3 py-2.5
          flex items-center gap-2
          text-sm text-white/90
          hover:bg-white/5
          transition
        "
                  >
                    <Pencil size={16} className="text-white/70" />
                    <span>Edit playlist</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await onTogglePublic();
                    }}
                    className="
          w-full px-3 py-2.5
          flex items-center gap-2
          text-sm text-white/90
          hover:bg-white/5
          transition
        "
                  >
                    {playlist.is_public ? (
                      <>
                        <Lock size={16} className="text-white/70" />
                        <span>Make private</span>
                      </>
                    ) : (
                      <>
                        <Globe size={16} className="text-white/70" />
                        <span>Make public</span>
                      </>
                    )}
                  </button>

                  <div className="h-px bg-white/10" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeletePlaylist();
                    }}
                    className="
          w-full px-3 py-2.5
          flex items-center gap-2
          text-sm text-red-300/90
          hover:bg-red-500/10
          transition
        "
                  >
                    <Trash2 size={16} className="text-red-400" />
                    <span>Delete playlist</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
        {!isOwner ? (
          <button
            type="button"
            onClick={onToggleSaveToLibrary}
            disabled={saveBusy}
            className="
              inline-flex items-center justify-center
              h-10 px-4 rounded-full
              bg-transparent border border-[#2A2A2D]
              text-[#B3B3B3] text-sm font-medium
              hover:text-white hover:border-[#3A3A3D]
              transition
              disabled:opacity-60 disabled:cursor-wait
              w-full sm:w-auto
            "
          >
            {isSavedToLibrary ? "Remove from library" : "Save to library"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
