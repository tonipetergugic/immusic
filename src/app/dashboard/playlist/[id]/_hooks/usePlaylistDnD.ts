"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import type { PlayerTrack } from "@/types/playerTrack";

export function usePlaylistDnD({
  isOwner,
  playlistId,
  playerTracks,
  setPlayerTracks,
  reorderPlaylistTracksAction,
}: {
  isOwner: boolean;
  playlistId: string;
  playerTracks: PlayerTrack[];
  setPlayerTracks: React.Dispatch<React.SetStateAction<PlayerTrack[]>>;
  reorderPlaylistTracksAction: (
    playlistId: string,
    payload: { track_id: string; position: number }[]
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  async function onDragEnd(e: DragEndEvent) {
    if (!isOwner) return;

    const activeId = String(e.active?.id ?? "");
    const overId = String(e.over?.id ?? "");

    if (!activeId || !overId || activeId === overId) return;

    const snapshot = [...playerTracks];
    const oldIndex = snapshot.findIndex((t) => t.id === activeId);
    const newIndex = snapshot.findIndex((t) => t.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(snapshot, oldIndex, newIndex);

    setPlayerTracks(next);

    const payload = next.map((track, index) => ({
      track_id: track.id,
      position: index + 1,
    }));

    const res = await reorderPlaylistTracksAction(playlistId, payload);

    if (!res.ok) {
      console.error("Failed to reorder playlist tracks:", res.error);
      setPlayerTracks(snapshot);
    }
  }

  return { onDragEnd };
}
