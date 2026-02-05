"use client";

import { useState } from "react";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

type PlayOverlayButtonProps = {
  track: PlayerTrack;

  // Visual size (rows vs cards). Default: "sm"
  size?: "sm" | "md" | "lg";

  // Render style: overlay (default) or standalone (for headers etc.)
  variant?: "overlay" | "standalone";

  // Optional: if the "current" identity differs from track.id (e.g. release card uses first track id)
  currentTrackId?: string;

  // Direct queue play (playlist rows etc.)
  index?: number;
  tracks?: PlayerTrack[];

  // Optional: async queue preparation (release cards etc.)
  getQueue?: () => Promise<{ tracks: PlayerTrack[]; index: number }>;
};

export default function PlayOverlayButton({
  track,
  size = "sm",
  variant = "overlay",
  currentTrackId,
  index,
  tracks,
  getQueue,
}: PlayOverlayButtonProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay, playQueue } = usePlayer();
  const [loading, setLoading] = useState(false);

  const SIZE = size ?? "sm";
  const sizeClass =
    SIZE === "sm"
      ? "w-9 h-9"
      : SIZE === "md"
      ? "w-10 h-10"
      : "w-14 h-14"; // lg – größer für Track Header

  const iconClass =
    SIZE === "sm"
      ? "w-4 h-4"
      : SIZE === "md"
      ? "w-4 h-4"
      : "w-6 h-6";

  const effectiveId = currentTrackId ?? track.id;
  const isCurrent = currentTrack?.id === effectiveId;

  const handleClick = async () => {
    if (loading) return;

    if (isCurrent) {
      togglePlay();
      return;
    }

    // Direct queue provided (fast path)
    if (tracks && typeof index === "number") {
      playQueue(tracks, index);
      return;
    }

    // Async queue preparation (e.g. release card)
    if (getQueue) {
      try {
        setLoading(true);
        const q = await getQueue();
        if (!q?.tracks || q.tracks.length === 0) return;
        playQueue(q.tracks, Math.max(0, q.index ?? 0));
        return;
      } finally {
        setLoading(false);
      }
    }

    // Fallback: play a single track
    playTrack(track);
  };

  const button = (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleClick();
      }}
      className={[
        "pointer-events-auto",
        "rounded-full border border-[#00FFC655] bg-black/55",
        "flex items-center justify-center",
        sizeClass,
        "shadow-[0_0_18px_rgba(0,255,198,0.22)]",
      ].join(" ")}
      aria-label={isCurrent && isPlaying ? "Pause track" : "Play track"}
    >
      {loading ? (
        <div className={["animate-pulse rounded-sm bg-[#00FFC6]", iconClass].join(" ")} />
      ) : isCurrent && isPlaying ? (
        <Pause className={["text-[#00FFC6]", iconClass].join(" ")} />
      ) : (
        <Play className={["text-[#00FFC6]", iconClass].join(" ")} />
      )}
    </button>
  );

  if (variant === "standalone") {
    return button;
  }

  return (
    <>
      {/* Mobile/Tablet: unsichtbare Tap-Fläche (kein Overlay sichtbar) */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleClick();
        }}
        className="md:hidden absolute inset-0 pointer-events-auto bg-transparent"
        aria-label={isCurrent && isPlaying ? "Pause track" : "Play track"}
      />

      {/* Desktop: Hover-Overlay mit sichtbarem Button */}
      <div
        className="
          hidden md:flex
          absolute inset-0
          items-center justify-center
          bg-black/35
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200 will-change-[opacity]
          pointer-events-none
        "
      >
        {button}
      </div>
    </>
  );
}
