"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import type { ReleaseTrackRow } from "@/types/releaseTrack";

type ClientTrackRowsProps = {
  releaseId: string;
  tracks: ReleaseTrackRow[];
};

export default function ClientTrackRows({ releaseId, tracks }: ClientTrackRowsProps) {
  const { currentTrack, playQueue } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const [queueTracks, setQueueTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const ensureQueueLoaded = async () => {
    if (queueTracks.length) return queueTracks;

    setLoading(true);
    const res = await fetch(`/api/releases/${releaseId}/queue`, {
      method: "GET",
      cache: "no-store",
    });
    setLoading(false);

    if (!res.ok) {
      throw new Error(`Failed to load release queue (${res.status})`);
    }

    const json = await res.json();
    const q = Array.isArray(json.queue) ? json.queue : [];
    setQueueTracks(q);
    return q;
  };

  // Which items to show in collapsed mode?
  const visibleTracks: ReleaseTrackRow[] = expanded ? tracks : tracks.slice(0, 1);

  return (
    <div className="flex flex-col gap-1">
      {visibleTracks
        .sort((a, b) => a.position - b.position)
        .map((rt, visibleIndex) => {
          const globalIndex = expanded ? visibleIndex : tracks.indexOf(rt);
          const isActive = currentTrack?.id === rt.tracks?.id;

          return (
            <div
              key={rt.id}
              onClick={async () => {
                try {
                  const q = await ensureQueueLoaded();
                  if (!q.length) return;
                  playQueue(q, globalIndex);
                } catch (err) {
                  console.error("ClientTrackRows play error:", err);
                }
              }}
              className={`
                flex items-center justify-between py-1 border-b border-white/5 text-sm cursor-pointer
                ${isActive ? "text-[#00FFC6]" : "text-white/80 hover:text-white"}
              `}
            >
              <span>
                {rt.position}. {rt.track_title || rt.tracks?.title || "Untitled Track"}
              </span>
            </div>
          );
        })}

      {/* Expand / Collapse */}
      {tracks.length > 1 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-[#00FFC6] hover:text-[#00E0B0] transition"
        >
          {expanded ? "Hide tracks" : `Show all ${tracks.length} tracks`}
        </button>
      )}
    </div>
  );
}
