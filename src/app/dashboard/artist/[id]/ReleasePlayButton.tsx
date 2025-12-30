"use client";

import { usePlayer } from "@/context/PlayerContext";
import { toPlayerTrack } from "@/lib/playerTrack";
import type { ReleaseTrackRow } from "@/types/releaseTrack";

export default function ReleasePlayButton({ tracks }: { tracks: ReleaseTrackRow[] }) {
  const { playQueue } = usePlayer();

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

  const handlePlay = () => {
    if (playerTracks.length > 0) {
      playQueue(playerTracks, 0);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handlePlay();
      }}
      className="
        absolute inset-0 m-auto
        w-14 h-14 rounded-full
        bg-[#00FFC6] text-black
        flex items-center justify-center
        text-xl
        opacity-0 group-hover:opacity-100
        shadow-[0_0_20px_rgba(0,255,198,0.4)]
        backdrop-blur-sm
        hover:bg-[#00E0B0]
        transition-all duration-300
      "
      style={{ pointerEvents: 'auto' }}
    >
      ▶
    </button>
  );
}
