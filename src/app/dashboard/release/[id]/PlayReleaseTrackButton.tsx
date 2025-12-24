"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { getReleaseQueueAction } from "./actions";
import type { PlayerTrack } from "@/types/playerTrack";
import { Play, Pause } from "lucide-react";

// In-memory Cache pro Release (pro Session)
const queueCache = new Map<string, PlayerTrack[]>();
const inflight = new Map<string, Promise<PlayerTrack[]>>();

async function loadQueue(releaseId: string): Promise<PlayerTrack[]> {
  if (queueCache.has(releaseId)) return queueCache.get(releaseId)!;
  if (inflight.has(releaseId)) return inflight.get(releaseId)!;

  const promise = (async () => {
    const q = (await getReleaseQueueAction(releaseId)) as PlayerTrack[];
    queueCache.set(releaseId, q);
    inflight.delete(releaseId);
    return q;
  })();

  inflight.set(releaseId, promise);
  return promise;
}

export default function PlayReleaseTrackButton({
  releaseId,
  startIndex,
}: {
  releaseId: string;
  startIndex: number;
}) {
  const { playQueue, pause, seek, currentTrack, isPlaying } = usePlayer();
  const [loading, setLoading] = useState(false);

  const cachedQueue = queueCache.get(releaseId);
  const targetTrackId =
    cachedQueue && cachedQueue[startIndex] ? cachedQueue[startIndex].id : null;

  const isThisTrackPlaying =
    isPlaying && !!targetTrackId && currentTrack?.id === targetTrackId;

  async function handleClick() {
    // STOP wenn genau dieser Track gerade läuft
    if (isThisTrackPlaying) {
      pause();
      seek(0);
      return;
    }

    setLoading(true);
    try {
      const queue = await loadQueue(releaseId);
      if (!queue.length) return;

      const safeIndex = Math.min(Math.max(startIndex, 0), queue.length - 1);
      playQueue(queue, safeIndex);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-10 h-10 rounded-md flex items-center justify-center
                 bg-neutral-900 border border-neutral-800
                 hover:bg-neutral-800 text-white
                 disabled:opacity-60"
      aria-label={isThisTrackPlaying ? "Stop track" : "Play track"}
      title={isThisTrackPlaying ? "Stop" : "Play"}
    >
      {loading ? (
        <span className="text-lg leading-none">…</span>
      ) : isThisTrackPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
    </button>
  );
}

