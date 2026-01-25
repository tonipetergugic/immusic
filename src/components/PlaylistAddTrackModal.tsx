"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerTrack } from "@/types/playerTrack";

type PublishedTrackApiRow = {
  id: string;
  title: string;
  bpm: number | null;
  key: string | null;
  artist_id: string | null;
  artist_name: string | null;
  cover_url: string | null;
};

type TrackOption = {
  raw: PublishedTrackApiRow;
  player: PlayerTrack | null;
};

type PlaylistAddTrackModalProps = {
  playlistId: string;
  open: boolean;
  onClose: () => void;
  onTrackAdded?: (track: PlayerTrack) => void;
  existingTrackIds?: string[];
};

const PLAYLIST_TRACK_SELECT = `
  position,
  tracks:tracks!playlist_tracks_track_id_fkey (
    *,
    releases:releases!tracks_release_id_fkey!inner (
      status,
      cover_path
    ),
    artist:profiles!tracks_artist_id_fkey (
      display_name
    )
  )
`;

export default function PlaylistAddTrackModal({
  playlistId,
  open,
  onClose,
  onTrackAdded,
  existingTrackIds = [],
}: PlaylistAddTrackModalProps) {
  const [options, setOptions] = useState<TrackOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const supabase = useMemo(
    () =>
      createSupabaseBrowserClient(),
    []
  );

  useEffect(() => {
    if (!open) {
      setActionId(null);
      setErrorMessage(null);
      return;
    }

    let isCancelled = false;

    async function loadTracks() {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/tracks/published", {
        method: "GET",
        cache: "no-store",
      });

      if (isCancelled) {
        return;
      }

      if (!res.ok) {
        console.error("Failed to load published tracks via API:", res.status);
        setOptions([]);
        setErrorMessage("Tracks konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const json = await res.json();
      const data = (json?.tracks ?? []) as PublishedTrackApiRow[];
      const error = null;

      if (error) {
        console.error("Failed to load published tracks:", error);
        setOptions([]);
        setErrorMessage("Tracks konnten nicht geladen werden.");
      } else {
        const mapped =
          data?.map((row) => ({
            raw: row,
            player: null,
          })) ?? [];
        setOptions(mapped);
      }

      setIsLoading(false);
    }

    loadTracks();

    return () => {
      isCancelled = true;
    };
  }, [open, supabase]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const filteredOptions = useMemo(() => {
    if (!existingTrackIds.length) {
      return options;
    }
    const excluded = new Set(existingTrackIds);
    return options.filter((option) => !excluded.has(option.raw.id));
  }, [existingTrackIds, options]);

  const handleSelect = useCallback(
    async (option: TrackOption) => {
      if (actionId) return;

      setActionId(option.raw.id);
      setErrorMessage(null);

      const nextPosition = (existingTrackIds?.length ?? 0) + 1;

      const { data, error } = await supabase
        .from("playlist_tracks")
        .insert({
          playlist_id: playlistId,
          track_id: option.raw.id,
          position: nextPosition,
        })
        .select(PLAYLIST_TRACK_SELECT)
        .single();

      if (error) {
        console.error("❌ Failed to add track to playlist:");
        console.log("⛔ Full supabase error:", JSON.stringify(error, null, 2));
        alert("INSERT ERROR — check console output");
        setErrorMessage("Track konnte nicht hinzugefügt werden.");
        setActionId(null);
        return;
      }

      if (data?.tracks) {
        try {
          const trackRecord = data.tracks as any;
          const res = await fetch(`/api/tracks/${trackRecord.id}/player`, {
            method: "GET",
            cache: "no-store",
          });

          if (!res.ok) {
            throw new Error(`Failed to load playerTrack (${res.status})`);
          }

          const json = await res.json();
          const playerTrack = json?.playerTrack;
          if (!playerTrack?.id) {
            throw new Error("Invalid playerTrack payload");
          }

          // Merge missing fields from the DB track record (insert select) to avoid "reload-only" UI data.
          const mergedPlayerTrack = {
            ...playerTrack,
            genre: playerTrack.genre ?? trackRecord.genre ?? null,
            bpm: playerTrack.bpm ?? trackRecord.bpm ?? null,
            key: playerTrack.key ?? trackRecord.key ?? null,
          };

          onTrackAdded?.(mergedPlayerTrack);
        } catch (err) {
          console.error("Track conversion failed:", err);
          if (option.player) {
            onTrackAdded?.(option.player);
          }
        }
      } else {
        if (option.player) {
          onTrackAdded?.(option.player);
        }
      }

      setActionId(null);
      onClose();
    },
    [actionId, existingTrackIds?.length, onClose, onTrackAdded, playlistId, supabase]
  );

  const visibleOptions = filteredOptions.filter((option) => {
    const { player, raw } = option;
    const title = (player?.title || raw.title || "").toLowerCase();
    const artist = (player?.profiles?.display_name || raw.artist_name || "").toLowerCase();
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return title.includes(q) || artist.includes(q);
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto">
      <div className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)] max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Add Track to Playlist</h2>
            {errorMessage && (
              <span className="text-xs font-medium text-red-400">{errorMessage}</span>
            )}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks or artists..."
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
          />
        </div>

        <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
          {isLoading && (
            <p className="text-sm text-white/60">Lade veröffentlichte Tracks...</p>
          )}

          {!isLoading && visibleOptions.length === 0 && (
            <p className="text-sm text-white/50">
              {query.trim() ? "No matches found." : "No published tracks available."}
            </p>
          )}

          {!isLoading &&
            visibleOptions.map((option) => {
              const { player, raw } = option;
              const isBusy = actionId === raw.id;
              return (
                <div
                  key={raw.id}
                  onClick={() => handleSelect(option)}
                  className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition ${
                    isBusy
                      ? "opacity-60 cursor-wait"
                      : "cursor-pointer hover:bg-white/[0.06] hover:border-[#00FFC6]/60"
                  }`}
                >
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-neutral-800">
                    <img
                      src={raw.cover_url ?? player?.cover_url ?? "/placeholder.png"}
                      alt={raw.title || player?.title || "Track"}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-white">
                      {player?.title || raw.title || "Untitled Track"}
                    </span>
                    <span className="text-xs text-white/60">
                      {player?.profiles?.display_name ?? raw.artist_name ?? "Unknown Artist"}
                    </span>
                  </div>

                  <div className="flex flex-col items-end text-xs text-white/60">
                    <span>BPM: {player?.bpm ?? raw.bpm ?? "—"}</span>
                    <span>Key: {player?.key ?? raw.key ?? "—"}</span>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] hover:border-[#00FFC6]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


