"use client";

import { useState, useRef } from "react";
import { Settings, ChevronDown } from "lucide-react";
import PlaylistSettingsMenu from "./PlaylistSettingsMenu";

export default function PlaylistSettingsTrigger({
  playlist,
  onTogglePublic,
  onDeletePlaylist,
  onEditDetails,
  isOwner,
}: {
  playlist: any;
  onTogglePublic: () => Promise<void>;
  onDeletePlaylist: () => void;
  onEditDetails: () => void;
  isOwner: boolean;
}) {
  if (!isOwner) return null;

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="
          inline-flex items-center gap-2 px-4 py-2 rounded-xl
          bg-neutral-900/60 border border-neutral-800
          hover:bg-neutral-800/60
          transition-all duration-200 ease-out
          hover:shadow-[0_0_12px_rgba(0,255,198,0.15)]
        "
      >
        <Settings size={18} className="text-white/80" />
        <span className="text-white/90 text-sm font-medium">
          Playlist Settings
        </span>
        <ChevronDown size={16} className="text-white/60" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 z-[999999] pointer-events-auto">
          <PlaylistSettingsMenu
            playlist={playlist}
            onTogglePublic={async () => {
              await onTogglePublic();
              setOpen(false);
            }}
            onEditDetails={() => {
              onEditDetails();
              setOpen(false);
            }}
            onDeletePlaylist={() => {
              onDeletePlaylist();
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
