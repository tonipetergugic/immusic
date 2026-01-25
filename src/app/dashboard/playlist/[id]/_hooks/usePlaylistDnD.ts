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
  function moveBothStates(activeId: string, overId: string) {
    setPlayerTracks((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === activeId);
      const newIndex = prev.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    if (!isOwner) return;

    const activeId = String(e.active?.id ?? "");
    const overId = String(e.over?.id ?? "");

    if (!activeId || !overId || activeId === overId) return;

    // 1) Optimistic UI
    moveBothStates(activeId, overId);

    // 2) Persist positions based on NEW playerTracks order
    const snapshot = [...playerTracks];
    const oldIndex = snapshot.findIndex((t) => t.id === activeId);
    const newIndex = snapshot.findIndex((t) => t.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(snapshot, oldIndex, newIndex);
    const payload = next.map((t, idx) => ({ track_id: t.id, position: idx + 1 }));

    const res = await reorderPlaylistTracksAction(playlistId, payload);

    if (!res.ok) {
      console.error("Failed to reorder playlist tracks:", res.error);
      setPlayerTracks(snapshot);
    }
  }

  return { onDragEnd };
}
