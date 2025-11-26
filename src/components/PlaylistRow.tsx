"use client";

import type { PlayerTrack } from "@/types/playerTrack";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";

export default function PlaylistRow({
  index,
  track,
  onDelete,
  tracks,
}: {
  index: number;
  track: PlayerTrack;
  tracks: PlayerTrack[];
  onDelete: () => void;
}) {
  return (
    <div
      className="
        group 
        grid grid-cols-[40px_60px_1fr_70px_70px_80px] 
        items-center 
        gap-3 
        px-4 py-2 
        rounded-lg 
        bg-neutral-900/40 
        hover:bg-neutral-800/50 
        border border-neutral-800 
        transition
      "
    >
      {/* Index */}
      <p className="text-white/50 text-xs">{index}</p>

      {/* Cover + Play Overlay */}
      <div className="w-12 h-12 rounded-md overflow-hidden relative group bg-neutral-700">
        <img
          src={track.cover_url || "/placeholder.png"}
          alt={track.title}
          className="w-full h-full object-cover"
        />

        <PlayOverlayButton track={track} index={index - 1} tracks={tracks} />
      </div>

      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-white">{track.title}</span>
        {track.profiles?.display_name && (
          <span className="text-xs text-white/50">
            · {track.profiles.display_name}
          </span>
        )}
      </div>

      {/* BPM */}
      <p className="text-white/50 text-sm">{track.bpm ?? "—"}</p>

      {/* Key */}
      <p className="text-white/50 text-sm">{track.key ?? "—"}</p>

      {/* Options */}
      <TrackOptionsTrigger track={track} onRemove={onDelete} tracks={tracks} />
    </div>
  );
}
