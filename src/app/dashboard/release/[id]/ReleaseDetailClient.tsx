"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { getReleaseQueueAction } from "./actions";
import type { PlayerTrack } from "@/types/playerTrack";
import { Play, Pause } from "lucide-react";

type Props = {
  releaseId: string;
};

export default function ReleaseDetailClient({ releaseId }: Props) {
  const { playQueue, pause, seek, isPlaying, queue } = usePlayer();
  const [loading, setLoading] = useState(false);

  const isSameReleasePlaying =
    isPlaying && queue.length > 0 && queue[0]?.release_id === releaseId;

  async function handleClick() {
    // STOP wenn dieselbe Release-Queue gerade läuft
    if (isSameReleasePlaying) {
      pause();
      return;
    }

    setLoading(true);
    try {
      const tracks = (await getReleaseQueueAction(releaseId)) as PlayerTrack[];
      if (tracks.length > 0) {
        playQueue(tracks, 0);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-11 h-11 rounded-full flex items-center justify-center
                 bg-white text-black hover:bg-neutral-200
                 disabled:opacity-60"
      aria-label={isSameReleasePlaying ? "Stop" : "Play"}
      title={isSameReleasePlaying ? "Stop" : "Play"}
    >
      {loading ? (
        <span className="text-lg leading-none">…</span>
      ) : isSameReleasePlaying ? (
        <Pause className="w-5 h-5" />
      ) : (
        <Play className="w-5 h-5" />
      )}
    </button>
  );
}

