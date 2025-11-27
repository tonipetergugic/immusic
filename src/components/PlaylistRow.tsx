"use client";

import type { PlayerTrack } from "@/types/playerTrack";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PlayOverlayButton from "@/components/PlayOverlayButton";
import TrackOptionsTrigger from "@/components/TrackOptionsTrigger";

export default function PlaylistRow({
  track,
  onDelete,
  tracks,
}: {
  track: PlayerTrack;
  tracks: PlayerTrack[];
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: active,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition:
      transition ||
      "transform 120ms cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 150ms ease",
    zIndex: active ? 200 : 1,
    position: "relative",
    opacity: active ? 0.96 : 1,
    boxShadow: active
      ? "0 10px 28px rgba(0, 0, 0, 0.5)"
      : "0 2px 6px rgba(0, 0, 0, 0.15)",
    borderRadius: "8px",
    backgroundColor: active ? "rgba(65, 65, 65, 0.65)" : "",
    scale: active ? "1.025" : "1.00",
    top: active ? "-2px" : "0px",
  };

  const currentIndex = tracks.findIndex((t) => t.id === track.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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
        transition-all
        cursor-grab active:cursor-grabbing
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]
        hover:border-neutral-700
      "
    >
      {/* Index */}
      <p className="text-white/50 text-xs">{currentIndex + 1}</p>

      {/* Cover + Play Overlay */}
      <div className="w-12 h-12 rounded-md overflow-hidden relative group bg-neutral-700">
        <img
          src={track.cover_url || "/placeholder.png"}
          alt={track.title}
          className="w-full h-full object-cover"
        />

        <PlayOverlayButton
          track={track}
          index={Math.max(currentIndex, 0)}
          tracks={tracks}
        />
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
