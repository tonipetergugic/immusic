"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type { PlayerTrack } from "@/types/playerTrack";
import TrackOptionsMenu from "@/components/TrackOptionsMenu";

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

type PlaylistRow = {
  id: string;
  title: string | null;
  description: string | null;
  cover_url: string | null;
  created_at: string | null;
  cover_public_url?: string | null;
};

function AddToPlaylistModal({
  open,
  onClose,
  track,
}: {
  open: boolean;
  onClose: () => void;
  track: PlayerTrack;
}) {
  const supabase = useMemo(
    () =>
      createSupabaseBrowserClient(),
    []
  );

  const trackId = (track as any)?.id as string | undefined;

  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (loadedOnce) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setLoading(false);
        alert("Not authenticated.");
        onClose();
        return;
      }

      const { data, error } = await supabase
        .from("playlists")
        .select("id,title,description,cover_url,created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load playlists:", error);
        setPlaylists([]);
      } else {
        const mapped = (data as PlaylistRow[]).map((pl) => {
          const coverPublicUrl = pl.cover_url ?? null;

          return {
            ...pl,
            cover_public_url: coverPublicUrl,
          };
        });
        setPlaylists(mapped);
      }

      setLoadedOnce(true);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, loadedOnce, onClose, supabase]);

  const addToPlaylist = async (playlistId: string) => {
    if (!trackId) {
      alert("Track ID is missing. Cannot add to playlist.");
      return;
    }
    if (busyId) return;

    setBusyId(playlistId);

    const { data: existing } = await supabase
      .from("playlist_tracks")
      .select("id")
      .eq("playlist_id", playlistId)
      .eq("track_id", trackId)
      .maybeSingle();

    if (existing) {
      alert("Track is already in this playlist.");
      setBusyId(null);
      return;
    }

    let nextPosition = 1;
    const { data: lastRow } = await supabase
      .from("playlist_tracks")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRow?.position) {
      nextPosition = Number(lastRow.position) + 1;
    }

    const { error: insertErr } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      track_id: trackId,
      position: nextPosition,
    });

    if (insertErr) {
      console.error("Failed to add track to playlist:", insertErr);
      alert("Could not add track to playlist. Check console.");
      setBusyId(null);
      return;
    }

    alert("Added to playlist.");
    setBusyId(null);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-[#2A2A2D] bg-[#1A1A1D] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify_between gap-3">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-white">Add to playlist</h2>
            <p className="text-sm text-white/60">
              Choose a playlist for{" "}
              <span className="text-white/80">{track?.title ?? "this track"}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#2A2A2D] px-3 py-2 text-sm font-semibold text-white/80 hover:bg-[#343438] transition"
          >
            Close
          </button>
        </div>

        <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
          {loading && <p className="text-sm text-white/60">Loading playlists…</p>}

          {!loading && playlists.length === 0 && (
            <p className="text-sm text-white/50">
              No playlists found. Create one first in your Library.
            </p>
          )}

          {!loading &&
            playlists.map((pl) => {
              const isBusy = busyId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => void addToPlaylist(pl.id)}
                  disabled={!!busyId}
                  className={`w-full text-left flex items-center gap-3 rounded-lg border border-[#2A2A2D] bg-[#1E1E20] px-4 py-3 transition ${
                    isBusy
                      ? "opacity-60 cursor-wait"
                      : "hover:border-[#00FFC6] cursor-pointer"
                  }`}
                >
                  <div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-neutral-800">
                    {pl.cover_public_url ? (
                      <img
                        src={pl.cover_public_url}
                        alt={pl.title ?? "Playlist cover"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-neutral-700" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-white">
                      {pl.title ?? "Untitled playlist"}
                    </span>
                    {pl.description && (
                      <span className="text-xs text-white/60 line-clamp-1">
                        {pl.description}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-white/50">
                    {isBusy ? "Adding…" : "Add"}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TrackOptionsTrigger({
  track,
  onRemove,
  showGoToArtist = true,
  showGoToRelease = false,
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
        className="h-6 w-6 flex items-center justify-center text-white/60 hover:text-[#00FFC6] transition"
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

