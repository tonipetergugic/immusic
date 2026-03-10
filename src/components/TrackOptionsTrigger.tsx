 "use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import type { PlayerTrack } from "@/types/playerTrack";
import TrackOptionsMenu from "@/components/TrackOptionsMenu";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";

type TrackOptionsTriggerProps = {
  track: PlayerTrack;
  onRemove?: () => void;
  tracks?: PlayerTrack[];
  showGoToArtist?: boolean;
  showGoToRelease?: boolean;
  releaseId?: string | null;
};

const MENU_HEIGHT = 232;
const MENU_WIDTH = 224;
const EDGE_GAP = 8;

export default function TrackOptionsTrigger({
  track,
  onRemove,
  showGoToArtist = true,
  showGoToRelease = true,
  releaseId = null,
}: TrackOptionsTriggerProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    openUpwards: false,
  });

  const [openAddModal, setOpenAddModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = () => setOpen(false);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const roomBelow = window.innerHeight - rect.bottom;
    const openUpwards = roomBelow < MENU_HEIGHT;

    const top = openUpwards
      ? rect.top + window.scrollY - EDGE_GAP
      : rect.bottom + window.scrollY + EDGE_GAP;

    const minLeft = window.scrollX + EDGE_GAP;
    const maxLeft = window.scrollX + window.innerWidth - MENU_WIDTH - EDGE_GAP;
    const idealLeft = rect.right + window.scrollX - MENU_WIDTH;
    const clampedLeft = Math.min(Math.max(idealLeft, minLeft), maxLeft);

    setMenuPosition({ top, left: clampedLeft, openUpwards });
  };

  const handleToggle = () => {
    if (open) {
      closeMenu();
      return;
    }
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handleGlobalClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        buttonRef.current?.contains(target) ||
        target?.closest("[data-track-options-menu]")
      ) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    const handleScrollOrResize = () => closeMenu();

    document.addEventListener("mousedown", handleGlobalClick);
    document.addEventListener("touchstart", handleGlobalClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
      document.removeEventListener("touchstart", handleGlobalClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={handleToggle}
        className="h-6 w-6 flex items-center justify-center text-white/60 hover:text-[#00FFC6] transition cursor-pointer"
        aria-label="Track options"
      >
        <MoreVertical size={16} />
      </button>

      {mounted && open
        ? createPortal(
            <TrackOptionsMenu
              track={track}
              onClose={closeMenu}
              onRemove={onRemove}
              onAddToPlaylist={() => setOpenAddModal(true)}
              position={menuPosition}
              showGoToArtist={showGoToArtist}
              showGoToRelease={showGoToRelease}
              releaseId={releaseId}
              context={onRemove ? "playlist" : "default"}
            />,
            document.body
          )
        : null}

      <AddToPlaylistModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        track={track}
      />
    </>
  );
}

