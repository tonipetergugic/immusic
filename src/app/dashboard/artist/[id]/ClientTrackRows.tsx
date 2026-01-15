"use client";

import { useMemo, useState } from "react";
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

  const sorted = useMemo(() => {
    return [...tracks].sort((a, b) => a.position - b.position);
  }, [tracks]);

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

  const visibleTracks: ReleaseTrackRow[] = expanded ? sorted : sorted.slice(0, 1);

  return (
    <div className="flex flex-col gap-1">
      {visibleTracks.map((rt, visibleIndex) => {
        const globalIndex = expanded ? visibleIndex : sorted.indexOf(rt);
        const trackId = rt.tracks?.id ?? null;
        const isActive = trackId ? currentTrack?.id === trackId : false;

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
            className={[
              "flex items-center justify-between",
              "px-2 py-2",
              "rounded-md",
              "border border-white/10 hover:border-white/15",
              "bg-white/0 hover:bg-white/5",
              "text-sm cursor-pointer transition",
              isActive ? "text-[#00FFC6]" : "text-white/80 hover:text-white",
            ].join(" ")}
          >
            <span className="truncate">
              {rt.position}. {rt.track_title || rt.tracks?.title || "Untitled Track"}
            </span>
          </div>
        );
      })}

      {tracks.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-[#00FFC6] hover:text-[#00E0B0] transition self-start"
        >
          {expanded ? "Hide tracks" : `Show all ${tracks.length} tracks`}
          {loading ? "…" : ""}
        </button>
      )}
    </div>
  );
}
