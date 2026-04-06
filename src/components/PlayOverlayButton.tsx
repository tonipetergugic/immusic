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
  disableIfTrackBlocked?: boolean;
};

export default function PlayOverlayButton({
  track,
  size = "sm",
  variant = "overlay",
  currentTrackId,
  index,
  tracks,
  getQueue,
  disableIfTrackBlocked = false,
}: PlayOverlayButtonProps) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    playQueue,
    isTrackPlaybackBlocked,
  } = usePlayer();
  const [loading, setLoading] = useState(false);

  const SIZE = size ?? "sm";
  const sizeClass =
    SIZE === "sm"
      ? "w-9 h-9"
      : SIZE === "md"
      ? "w-10 h-10"
      : "w-20 h-20"; // lg – größer für Track Header

  const iconClass =
    SIZE === "sm"
      ? "w-4 h-4"
      : SIZE === "md"
      ? "w-4 h-4"
      : "w-8 h-8";

  const effectiveId = currentTrackId ?? track.id;
  const isCurrent = currentTrack?.id === effectiveId;
  const isBlocked = isTrackPlaybackBlocked(track);
  const hasPlayableQueuedTrack = Array.isArray(tracks)
    ? tracks.some((item) => !isTrackPlaybackBlocked(item))
    : false;
  const shouldDisable = Array.isArray(tracks) && tracks.length > 0 ? !hasPlayableQueuedTrack : isBlocked;
  const effectiveShouldDisable = disableIfTrackBlocked ? isBlocked : shouldDisable;

  const handleClick = async () => {
    if (loading) return;

    if (isCurrent) {
      if (effectiveShouldDisable) return;
      togglePlay();
      return;
    }

    // Direct queue provided (fast path)
    if (tracks && typeof index === "number") {
      if (effectiveShouldDisable) return;
      playQueue(tracks, index);
      return;
    }

    // Async queue preparation (e.g. release card)
    if (getQueue) {
      try {
        setLoading(true);
        const q = await getQueue();
        if (!q?.tracks || q.tracks.length === 0) return;
        if (q.tracks.every((item) => isTrackPlaybackBlocked(item))) return;
        playQueue(q.tracks, Math.max(0, q.index ?? 0));
        return;
      } finally {
        setLoading(false);
      }
    }

    // Fallback: play a single track
    if (effectiveShouldDisable) return;
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
        "rounded-full flex items-center justify-center",
        sizeClass,
        effectiveShouldDisable
          ? "border border-white/12 bg-black/55 cursor-not-allowed opacity-55"
          : "border border-[#00FFC655] bg-black/55 cursor-pointer shadow-[0_0_18px_rgba(0,255,198,0.22)]",
      ].join(" ")}
      aria-label={effectiveShouldDisable ? "Explicit playback blocked" : isCurrent && isPlaying ? "Pause track" : "Play track"}
    >
      {loading ? (
        <div className={["animate-pulse rounded-sm bg-[#00FFC6]", iconClass].join(" ")} />
      ) : effectiveShouldDisable ? (
        <Play className={["text-white/45", iconClass].join(" ")} />
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
        aria-label={effectiveShouldDisable ? "Explicit playback blocked" : isCurrent && isPlaying ? "Pause track" : "Play track"}
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
