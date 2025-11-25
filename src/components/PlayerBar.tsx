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
    <div
      className="
        w-full h-24 
        bg-[#0B0B0D]/80 
        backdrop-blur-xl 
        border-t border-[#1A1A1C] 
        shadow-[0_-2px_25px_rgba(0,255,198,0.06)]
        px-6 
        flex items-center justify-between
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
  );
}
