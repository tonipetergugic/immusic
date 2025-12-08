"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { toPlayerTrack } from "@/lib/playerTrack";
import type { ReleaseTrackRow } from "@/types/releaseTrack";

type ClientTrackRowsProps = {
  releaseId: string;
  tracks: ReleaseTrackRow[];
};

export default function ClientTrackRows({ releaseId, tracks }: ClientTrackRowsProps) {
  const { currentTrack, playQueue } = usePlayer();
  const [expanded, setExpanded] = useState(false);

  // Convert to PlayerTrack[]
  const playerTracks = tracks.map((rt): ReturnType<typeof toPlayerTrack> => {
    return toPlayerTrack({
      id: rt.tracks?.id ?? "",
      title: rt.track_title || rt.tracks?.title || "Untitled Track",
      artist_id: null,
      audio_path: rt.tracks?.audio_path ?? null,
      releases: rt.releases
        ? {
            ...rt.releases,
            status: rt.releases.status ?? "",
          }
        : null,
      profiles: null,
    });
  });

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
              onClick={() => playQueue(playerTracks, globalIndex)}
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
