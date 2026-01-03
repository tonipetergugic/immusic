"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
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

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
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
          onTrackAdded?.(playerTrack);
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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-[#2A2A2D] bg-[#1A1A1D] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Add Track to Playlist</h2>
          {errorMessage && (
            <span className="text-xs font-medium text-red-400">{errorMessage}</span>
          )}
        </div>

        <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
          {isLoading && (
            <p className="text-sm text-white/60">Lade veröffentlichte Tracks...</p>
          )}

          {!isLoading && filteredOptions.length === 0 && (
            <p className="text-sm text-white/50">No published tracks available.</p>
          )}

          {!isLoading &&
            filteredOptions.map((option) => {
              const { player, raw } = option;
              const isBusy = actionId === raw.id;
              return (
                <div
                  key={raw.id}
                  onClick={() => handleSelect(option)}
                  className={`flex items-center gap-3 rounded-lg border border-[#2A2A2D] bg-[#1E1E20] p-3 transition ${
                    isBusy
                      ? "opacity-60 cursor-wait"
                      : "cursor-pointer hover:border-[#00FFC6]"
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
            className="rounded-lg bg-[#00FFC6] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[#00e0b0]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


