"use client";

import { useEffect } from "react";

export default function AddTrackModal({
  open,
  onClose,
  tracks,
  onSelectTrack,
  search,
  onSearchChange,
  localTracks,
}: {
  open: boolean;
  onClose: () => void;
  tracks: {
    id: string;
    title: string;
    artist: string;
    cover_url: string | null;
    artist_id: string | null;
  }[];
  onSelectTrack: (trackId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  localTracks: any[];
}) {

  // ESC schließen
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!open) return null;

  // Safety guards
  const safeTracks = tracks ?? [];
  const safeLocalTracks = localTracks ?? [];

  const items = safeTracks.map((t) => {
    const alreadyAdded =
      safeLocalTracks?.some((lt: any) => lt?.tracks?.id === t.id) ?? false;

    return {
      ...t,
      alreadyAdded,
    };
  });

  // Search
  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = normalizedSearch
    ? items.filter(
        (track) =>
          track.title.toLowerCase().includes(normalizedSearch) ||
          track.artist.toLowerCase().includes(normalizedSearch)
      )
    : items;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-neutral-900 rounded-xl p-6 w-full max-w-lg border border-neutral-800 shadow-xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-xl text-white">Add Track</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Search Field */}
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or artist…"
          className="
            w-full mb-3 px-3 py-2 rounded-md 
            bg-neutral-800 text-white
            border border-neutral-700 
            placeholder-white/40
            focus:outline-none focus:ring-0 focus:border-neutral-600
          "
        />

        {/* Track List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">

          {visibleItems.map((track) => (
            <button
              key={track.id}
              disabled={track.alreadyAdded}
              onClick={() => !track.alreadyAdded && onSelectTrack(track.id)}
              className={`flex items-center gap-4 w-full p-3 rounded-lg border transition ${
                track.alreadyAdded
                  ? "bg-neutral-900/40 border-neutral-800 text-white/40 cursor-not-allowed opacity-50"
                  : "bg-neutral-900/70 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700"
              }`}
            >
              {/* Cover */}
              <img
                src={track.cover_url ?? ""}
                alt={track.title}
                className="w-12 h-12 rounded-md object-cover flex-shrink-0"
              />

              <div className="flex flex-col items-start w-[calc(100%-64px)]">
                <span className="font-semibold text-white text-base leading-tight">
                  {track.title}
                </span>
                <span className="text-white/60 text-sm leading-tight mt-1">
                  {track.artist}
                </span>
              </div>
            </button>
          ))}

          {visibleItems.length === 0 && (
            <p className="text-white/50 text-sm text-center py-4">
              No tracks found.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
