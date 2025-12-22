"use client";

import { useState, useRef, useEffect } from "react";
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
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        open &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      {/* Trigger Button styled EXACTLY like Add Track */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="
          inline-flex items-center justify-center gap-2
          h-11 px-5 rounded-full
          bg-transparent border border-[#00FFC633]
          text-[#00FFC6] text-sm font-medium
          hover:border-[#00FFC666]
          hover:bg-[#00FFC60F]
          transition
          w-full sm:w-auto
        "
      >
        <Settings size={16} className="text-current" />
        <span className="font-medium">Playlist Settings</span>
        <ChevronDown size={16} className="text-current opacity-80" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-2 z-[999999] pointer-events-auto"
        >
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
