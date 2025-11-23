"use client";

import { Track } from "@/types/database";
import PlayOverlayButton from "@/components/PlayOverlayButton";

export default function PlaylistRow({
  index,
  track,
  onDelete,
}: {
  index: number;
  track: Track;
  onDelete: () => void;
}) {
  return (
    <div
      className="
        group 
        grid grid-cols-[40px_60px_1fr_70px_70px_80px] 
        items-center 
        gap-4 
        px-4 py-3 
        rounded-lg 
        bg-neutral-900/40 
        hover:bg-neutral-800/60 
        border border-neutral-800 
        transition
      "
    >
      {/* Index */}
      <p className="text-white/40 text-sm">{index}</p>

      {/* Cover + Play Overlay */}
      <div className="w-14 h-14 rounded-md overflow-hidden relative group bg-neutral-700">
        <img
          src={track.cover_url || "/placeholder.png"}
          alt={track.title}
          className="w-full h-full object-cover"
        />

        <PlayOverlayButton track={track} />
      </div>

      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{track.title}</span>
        {track.artist?.display_name && (
          <span className="text-xs text-white/50">
            · {track.artist.display_name}
          </span>
        )}
      </div>

      {/* BPM */}
      <p className="text-white/50">{track.bpm ?? "—"}</p>

      {/* Key */}
      <p className="text-white/50">{track.key ?? "—"}</p>

      {/* Remove */}
      <button
        onClick={onDelete}
        className="
          opacity-0 group-hover:opacity-100 
          bg-red-600 hover:bg-red-500 
          text-white text-xs 
          px-3 py-1 rounded 
          transition
        "
      >
        Remove
      </button>
    </div>
  );
}
