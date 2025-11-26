"use client";

import type { PlayerTrack } from "@/types/playerTrack";

type TrackOptionsMenuProps = {
  track: PlayerTrack;
  onClose: () => void;
  onRemove?: () => void;
  position: {
    top: number;
    left: number;
    openUpwards: boolean;
  };
};

const MENU_ITEMS = [
  { label: "Add to playlist" },
  { label: "Save to Library" },
  { label: "Share Track" },
  { label: "Go to Artist" },
  { label: "Go to Track Page" },
  { label: "Remove from Playlist", action: "remove" as const },
];

export default function TrackOptionsMenu({
  track,
  onClose,
  onRemove,
  position,
}: TrackOptionsMenuProps) {
  const handleItemClick = (action?: "remove") => {
    if (action === "remove") {
      onRemove?.();
    }
    onClose();
  };

  return (
    <div
      data-track-options-menu
      role="menu"
      aria-label={`Options for ${track.title || "track"}`}
      className="absolute z-50 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl p-2"
      style={{
        top: position.top,
        left: position.left,
        transform: position.openUpwards ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="flex flex-col gap-1">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleItemClick(item.action)}
            role="menuitem"
            className="px-3 py-2 text-sm text-white/80 rounded-md hover:bg-neutral-800/50 transition text-left cursor-pointer w-full"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

