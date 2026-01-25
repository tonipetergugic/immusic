"use client";

import { Play } from "lucide-react";
import PlaylistSettingsTrigger from "@/components/PlaylistSettingsTrigger";
import type { Playlist } from "@/types/database";

export default function PlaylistActionsBar({
  isOwner,
  playlist,
  user,
  isSavedToLibrary,
  saveBusy,
  onPlay,
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

  onPlay: () => void;
  onAddTrack: () => void;
  onToggleSaveToLibrary: () => void;

  onTogglePublic: () => Promise<void>;
  onDeletePlaylist: () => void;
  onEditDetails: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="
            inline-flex items-center justify-center gap-2
            h-11 px-5 rounded-full
            bg-[#0E0E10] border border-[#00FFC633]
            text-[#00FFC6] text-sm font-semibold
            hover:border-[#00FFC666]
            hover:bg-[#00FFC60F]
            transition
            w-full sm:w-auto
            min-w-[132px]
          "
        >
          <span className="inline-flex w-4 items-center justify-center">
            <Play size={18} />
          </span>

          <span className="inline-block w-[52px] text-left">Play</span>
        </button>

        {isOwner ? (
          <button
            type="button"
            onClick={onAddTrack}
            className="
              inline-flex items-center justify-center gap-2
              h-11 px-5 rounded-full
              bg-[#0E0E10] border border-[#00FFC633]
              text-[#00FFC6] text-sm font-semibold
              hover:border-[#00FFC666]
              hover:bg-[#00FFC60F]
              transition
              w-full sm:w-auto
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
            Add Track
          </button>
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

        {isOwner ? (
          <div className="w-full sm:w-auto">
            <PlaylistSettingsTrigger
              playlist={playlist}
              isOwner={true}
              onTogglePublic={onTogglePublic}
              onDeletePlaylist={onDeletePlaylist}
              onEditDetails={onEditDetails}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
