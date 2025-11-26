"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, ChevronDown } from "lucide-react";
import PlaylistSettingsMenu from "./PlaylistSettingsMenu";

export default function PlaylistSettingsTrigger({
  playlist,
  onAddTrack,
  onTogglePublic,
  isOwner,
}: {
  playlist: any;
  onAddTrack: () => void;
  onTogglePublic: () => Promise<void>;
  isOwner: boolean;
}) {
  if (!isOwner) return null;

  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on ESC
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="relative">
      {/* Modern Settings Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
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
        <PlaylistSettingsMenu
          playlist={playlist}
          onAddTrack={() => {
            onAddTrack();
            setOpen(false);
          }}
          onTogglePublic={async () => {
            await onTogglePublic();
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
