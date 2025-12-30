"use client";

import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { toPlayerTrack } from "@/lib/playerTrack";
import type { ReleaseTrackRow } from "@/types/releaseTrack";

export default function ReleasePlayButton({ tracks }: { tracks: ReleaseTrackRow[] }) {
  const { playQueue, currentTrack, isPlaying, togglePlay, queue } = usePlayer();

  const playerTracks = tracks.map((rt) =>
    toPlayerTrack({
      id: rt.tracks?.id ?? "",
      title: rt.track_title || rt.tracks?.title || "Untitled Track",
      artist_id: rt.tracks?.artist_id ?? "",
      audio_path: rt.tracks?.audio_path ?? null,
      releases: rt.releases
        ? {
            ...rt.releases,
            status: rt.releases.status ?? "",
          }
        : null,
      profiles: null,
    })
  );

  // Check if this release is currently playing
  const firstTrackId = playerTracks[0]?.id;
  const isCurrent =
    !!firstTrackId &&
    currentTrack?.id === firstTrackId &&
    queue.length === playerTracks.length &&
    queue.every((t, i) => t.id === playerTracks[i]?.id);

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();
    } else if (playerTracks.length > 0) {
      playQueue(playerTracks, 0);
    }
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
