"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrev,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = useState(1);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    seek(value);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    if (value === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      setLastVolumeBeforeMute(value);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      // zurück zum letzten Volume
      setIsMuted(false);
      setVolume(lastVolumeBeforeMute || 1);
    } else {
      setIsMuted(true);
      setLastVolumeBeforeMute(volume || 1);
      setVolume(0);
    }
  };

  if (!currentTrack) {
    return (
      <div className="w-full flex items-center justify-center text-xs text-white/40 tracking-wide uppercase">
        Select a track to start playback
      </div>
    );
  }

  return (
    <>
      {/* Desktop (>= md) unchanged */}
      <div
        className="
          hidden md:flex
          w-full h-24 
          bg-[#0B0B0D]/80 
          backdrop-blur-xl 
          border-t border-[#1A1A1C] 
          shadow-[0_-2px_25px_rgba(0,255,198,0.06)]
          px-6 
          items-center justify-between
        "
      >
        <div className="flex items-center gap-4 min-w-[200px]">
          {/* Cover */}
          <div className="w-12 h-12 rounded-md overflow-hidden bg-neutral-900">
            {currentTrack.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40">
                No Cover
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex flex-col">
            <span className="text-white/90 text-sm font-medium truncate">
              {currentTrack.title}
            </span>
            <span className="text-white/50 text-xs truncate">
              {currentTrack?.profiles?.display_name ?? "Unknown Artist"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 w-[40%]">
          <div className="flex items-center gap-4">
            {/* Previous */}
            <button
              type="button"
              onClick={playPrev}
              className="text-white/60 hover:text-[#00FFC6] transition-colors"
            >
              <SkipBack size={18} />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="
                w-11 h-11 rounded-full
                flex items-center justify-center
                bg-[#121214]
                text-white/90
                hover:text-[#00FFC6]
                hover:bg-[#00FFC6]/10
                transition-all
              "
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={playNext}
              className="text-white/60 hover:text-[#00FFC6] transition-colors"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="flex items-center w-full gap-3">
            <span className="text-white/50 text-xs w-10 text-right">
              {formatTime(progress)}
            </span>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={handleSeek}
              className="
                w-full h-[3px]
                rounded-lg
                accent-[#00FFC6]
                bg-[#0D0D0F]
                cursor-pointer
              "
            />

            <span className="text-white/50 text-xs w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[200px] justify-end">
          <button
            type="button"
            onClick={toggleMute}
            className="
              text-white/70 hover:text-[#00FFC6] 
              transition-colors
            "
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="
              w-24 h-[3px]
              rounded-lg
              accent-[#00FFC6]
              bg-[#0D0D0F]
              cursor-pointer
            "
          />
        </div>
      </div>

      {/* Mobile (< md): Collapsed */}
      {!mobileExpanded ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setMobileExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMobileExpanded(true);
            }
          }}
          className="
            md:hidden
            w-full h-16
            bg-[#0B0B0D]/80
            backdrop-blur-xl
            border-t border-[#1A1A1C]
            shadow-[0_-2px_25px_rgba(0,255,198,0.06)]
            px-4
            flex items-center justify-between
            text-left
            cursor-pointer
          "
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Cover */}
            <div className="w-11 h-11 rounded-md overflow-hidden bg-neutral-900 shrink-0">
              {currentTrack.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40">
                  No Cover
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="min-w-0 flex-1">
              <div className="text-white/90 text-[13px] font-medium truncate max-w-full">
                {currentTrack.title}
              </div>
              <div className="text-white/50 text-[11px] truncate">
                {currentTrack?.profiles?.display_name ?? "Unknown Artist"}
              </div>
            </div>
          </div>

          {/* Controls (stopPropagation so tap-to-expand doesn't trigger) */}
          <div
            className="flex items-center gap-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playPrev();
              }}
              className="text-white/70 hover:text-[#00FFC6] transition-colors"
              aria-label="Previous"
            >
              <SkipBack size={20} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="
                w-11 h-11 rounded-full
                flex items-center justify-center
                bg-[#121214]
                text-white/90
                hover:text-[#00FFC6]
                hover:bg-[#00FFC6]/10
                transition-all
              "
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playNext();
              }}
              className="text-white/70 hover:text-[#00FFC6] transition-colors"
              aria-label="Next"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="md:hidden">
          {/* backdrop */}
          <button
            type="button"
            onClick={() => setMobileExpanded(false)}
            className="fixed inset-0 z-40 bg-black/50"
            aria-label="Close player"
          />

          {/* sheet */}
          <div
            className="
              fixed left-0 right-0 bottom-0 z-50
              h-[88vh]
              bg-[#0B0B0D]/95
              backdrop-blur-xl
              border-t border-[#1A1A1C]
              shadow-[0_-2px_25px_rgba(0,255,198,0.10)]
              rounded-t-3xl
              px-5 pt-3 pb-6
              flex flex-col
            "
          >
            {/* grabber + close */}
            <div className="relative flex items-center justify-center pb-3">
              <div className="h-1 w-12 rounded-full bg-white/15" />
              <button
                type="button"
                onClick={() => setMobileExpanded(false)}
                className="
                  absolute right-0
                  w-10 h-10 rounded-full
                  bg-white/5 border border-white/10
                  text-white/80
                  flex items-center justify-center
                  hover:bg-white/10
                  transition-colors
                "
                aria-label="Collapse player"
              >
                ✕
              </button>
            </div>

            {/* big cover */}
            <div className="mx-auto w-full max-w-[360px]">
              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-900">
                {currentTrack.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-white/40">
                    No Cover
                  </div>
                )}
              </div>
            </div>

            {/* title/artist */}
            <div className="mt-5 text-center">
              <div className="text-white/95 text-xl font-semibold truncate">
                {currentTrack.title}
              </div>
              <div className="mt-1 text-white/60 text-sm truncate">
                {currentTrack?.profiles?.display_name ?? "Unknown Artist"}
              </div>
            </div>

            {/* seek */}
            <div className="mt-6">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                onChange={handleSeek}
                className="
                  w-full h-[4px]
                  rounded-lg
                  accent-[#00FFC6]
                  bg-[#0D0D0F]
                  cursor-pointer
                "
              />
              <div className="mt-2 flex items-center justify-between text-xs text-white/50 tabular-nums">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* controls */}
            <div className="mt-2 flex items-center justify-center gap-7">
              <button
                type="button"
                onClick={playPrev}
                className="text-white/80 hover:text-[#00FFC6] transition-colors"
                aria-label="Previous"
              >
                <SkipBack size={26} />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="
                  w-16 h-16 rounded-full
                  flex items-center justify-center
                  bg-[#121214]
                  text-white/95
                  hover:text-[#00FFC6]
                  hover:bg-[#00FFC6]/10
                  transition-all
                "
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={26} /> : <Play size={26} />}
              </button>

              <button
                type="button"
                onClick={playNext}
                className="text-white/80 hover:text-[#00FFC6] transition-colors"
                aria-label="Next"
              >
                <SkipForward size={26} />
              </button>
            </div>

            {/* volume */}
            <div className="mt-12 flex items-center gap-4">
              <button
                type="button"
                onClick={toggleMute}
                className="text-white/80 hover:text-[#00FFC6] transition-colors"
                aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="
                  w-full h-[4px]
                  rounded-lg
                  accent-[#00FFC6]
                  bg-[#0D0D0F]
                  cursor-pointer
                "
              />
            </div>

            {/* spacer (safe area feel) */}
            <div className="flex-1" />
          </div>
        </div>
      )}
    </>
  );
}
