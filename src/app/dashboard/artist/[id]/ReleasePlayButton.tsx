"use client";

import { useState } from "react";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { ReleaseTrackRow } from "@/types/releaseTrack";

export default function ReleasePlayButton({ tracks }: { tracks: ReleaseTrackRow[] }) {
  const { playQueue, currentTrack, isPlaying, togglePlay, queue } = usePlayer();
  const [queueTracks, setQueueTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReleaseQueue = async () => {
    if (!tracks.length) return [];

    const releaseId = tracks[0].release_id;
    if (!releaseId) return [];

    setLoading(true);

    const res = await fetch(`/api/releases/${releaseId}/queue`, {
      method: "GET",
      cache: "no-store",
    });

    setLoading(false);

    if (!res.ok) {
      throw new Error("Failed to load release queue");
    }

    const json = await res.json();
    return Array.isArray(json.queue) ? json.queue : [];
  };

  const firstTrackId = queueTracks[0]?.id;
  const isCurrent =
    !!firstTrackId &&
    currentTrack?.id === firstTrackId &&
    queue.length === queueTracks.length &&
    queue.every((t, i) => t.id === queueTracks[i]?.id);

  const handleClick = async () => {
    if (isCurrent) {
      togglePlay();
      return;
    }

    const q = await loadReleaseQueue();
    if (!q.length) return;

    setQueueTracks(q);
    playQueue(q, 0);
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
      className="
        w-14 h-14 rounded-full
        bg-[#00FFC6] hover:bg-[#00E0B0]
        flex items-center justify-center
        shadow-[0_0_20px_rgba(0,255,198,0.40)]
        backdrop-blur-md
      "
      aria-label={isCurrent && isPlaying ? "Pause release" : "Play release"}
    >
      {isCurrent && isPlaying ? (
        <Pause size={26} className="text-black" />
      ) : (
        <Play size={26} className="text-black" />
      )}
    </button>
  );
}
