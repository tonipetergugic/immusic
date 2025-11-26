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
          flex items-center gap-2
          px-4 h-10
          rounded-md
          bg-[#1A1A1C]/80
          border border-[#2A2A2D]
          text-white/80 text-sm
          hover:bg-[#2A2A2D]
          hover:text-white
          hover:border-[#00FFC622]
          hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
          backdrop-blur-lg
          transition
        "
      >
        <Settings size={16} className="text-white/80" />
        <span className="font-medium">Playlist Settings</span>
        <ChevronDown size={16} className="text-white/70" />
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
