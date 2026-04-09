"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/context/PlayerContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
} from "lucide-react";
import MobileFullscreenPlayer from "@/components/MobileFullscreenPlayer";

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
    isShuffle,
    togglePlay,
    seek,
    setVolume,
    toggleShuffle,
    playNext,
    playPrev,
  } = usePlayer();

  const router = useRouter();

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

  function goToTrack() {
    const releaseId = currentTrack?.release_id ?? null;
    if (!releaseId) return;
    setMobileExpanded(false);
    router.push(`/dashboard/release/${releaseId}`);
  }

  function goToArtist() {
    if (!currentTrack?.artist_id) return;
    setMobileExpanded(false);
    router.push(`/dashboard/artist/${currentTrack.artist_id}`);
  }

  if (!currentTrack) {
    return (
      <div className="w-full flex items-center justify-center text-xs text-white/40 tracking-wide uppercase">
        Select a track to start playback
      </div>
    );
  }

  return (
    <>
      {/* Desktop (lg+) */}
      <div
        className="
          hidden lg:flex
          h-20 w-full items-center justify-between
          border-t border-white/8
          bg-[#0A0A0C]/88
          px-6
          shadow-[0_-8px_30px_rgba(0,0,0,0.24)]
          backdrop-blur-2xl
        "
      >
        <div className="flex min-w-[240px] items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
            {currentTrack.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                No Cover
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold leading-tight text-white/95">
              {currentTrack.title}
            </span>
            <span className="mt-1 truncate text-[12px] leading-none text-white/55">
              {currentTrack?.profiles?.display_name ?? "Unknown Artist"}
            </span>
          </div>
        </div>

        <div className="flex w-[42%] flex-col items-center gap-2.5">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                isShuffle
                  ? "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#00FFC6]"
                  : "border-white/8 bg-white/[0.03] text-white/68 hover:text-[#00FFC6]"
              }`}
              aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
              title={isShuffle ? "Shuffle on" : "Shuffle off"}
            >
              <Shuffle size={16} />
            </button>

            <button
              type="button"
              onClick={playPrev}
              className="
                inline-flex h-10 w-10 items-center justify-center rounded-full
                text-white/72 transition-colors hover:text-[#00FFC6]
              "
              aria-label="Previous"
            >
              <SkipBack size={19} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="
                inline-flex h-12 w-12 items-center justify-center rounded-full
                border border-white/10 bg-[#151518] text-white/95
                shadow-[0_10px_28px_rgba(0,0,0,0.28)]
                transition-all hover:bg-[#00FFC6]/10 hover:text-[#00FFC6]
              "
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={19} /> : <Play size={19} className="ml-[1px]" />}
            </button>

            <button
              type="button"
              onClick={playNext}
              className="
                inline-flex h-10 w-10 items-center justify-center rounded-full
                text-white/72 transition-colors hover:text-[#00FFC6]
              "
              aria-label="Next"
            >
              <SkipForward size={19} />
            </button>
          </div>

          <div className="flex w-full items-center gap-3">
            <span className="w-10 text-right text-[12px] font-medium tabular-nums text-white/58">
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
                h-[4px] w-full cursor-pointer rounded-full
                bg-white/10 accent-[#00FFC6]
              "
            />

            <span className="w-10 text-[12px] font-medium tabular-nums text-white/58">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex min-w-[240px] items-center justify-end gap-3">
          <button
            type="button"
            onClick={toggleMute}
            className="
              inline-flex h-9 w-9 items-center justify-center rounded-full
              border border-white/8 bg-white/[0.03]
              text-white/72 transition-colors hover:text-[#00FFC6]
            "
            aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="
              h-[4px] w-28 cursor-pointer rounded-full
              bg-white/10 accent-[#00FFC6]
            "
          />
        </div>
      </div>

      {/* Tablet (md to < lg) */}
      <div
        className="
          hidden md:flex lg:hidden
          w-full h-20
          bg-[#0B0B0D]/80
          backdrop-blur-xl
          border-t border-[#1A1A1C]
          shadow-[0_-2px_25px_rgba(0,255,198,0.06)]
          px-4
          items-center gap-4
        "
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-neutral-900">
            {currentTrack.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                No Cover
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white/90">
              {currentTrack.title}
            </div>
            <div className="truncate text-xs text-white/50">
              {currentTrack?.profiles?.display_name ?? "Unknown Artist"}
            </div>
          </div>
        </div>

        <div className="flex w-[320px] shrink-0 flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={playPrev}
              className="text-white/60 transition-colors hover:text-[#00FFC6]"
              aria-label="Previous"
            >
              <SkipBack size={18} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="
                flex h-10 w-10 items-center justify-center rounded-full
                bg-[#121214] text-white/90
                transition-all
                hover:bg-[#00FFC6]/10 hover:text-[#00FFC6]
              "
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              type="button"
              onClick={playNext}
              className="text-white/60 transition-colors hover:text-[#00FFC6]"
              aria-label="Next"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="flex w-full items-center gap-2.5">
            <span className="w-9 text-right text-[11px] text-white/50">
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
                h-[3px] w-full cursor-pointer rounded-lg
                accent-[#00FFC6] bg-[#0D0D0F]
              "
            />

            <span className="w-9 text-[11px] text-white/50">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={toggleMute}
            className="text-white/70 transition-colors hover:text-[#00FFC6]"
            aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile (< md): Collapsed */}
      {!mobileExpanded ? (
        <div
          className="
            md:hidden
            flex h-[72px] w-full items-center justify-between
            border-t border-white/8
            bg-[#0A0A0C]/88
            px-3.5
            shadow-[0_-8px_30px_rgba(0,0,0,0.32)]
            backdrop-blur-2xl
          "
        >
          <button
            type="button"
            onClick={() => setMobileExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-3 pr-3 text-left"
            aria-label="Open player"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
              {currentTrack.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                  No Cover
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight text-white/95">
                {currentTrack.title}
              </div>
              <div className="mt-1 truncate text-[11px] leading-none text-white/55">
                {currentTrack?.profiles?.display_name ?? "Unknown Artist"}
              </div>
            </div>
          </button>

          <div className="ml-2 flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={playPrev}
              className="
                inline-flex h-9 w-9 items-center justify-center rounded-full
                text-white/72 transition-colors hover:text-[#00FFC6]
              "
              aria-label="Previous"
            >
              <SkipBack size={19} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="
                inline-flex h-11 w-11 items-center justify-center rounded-full
                border border-white/10 bg-[#151518] text-white/95
                shadow-[0_8px_24px_rgba(0,0,0,0.28)]
                transition-all hover:bg-[#00FFC6]/10 hover:text-[#00FFC6]
              "
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={19} /> : <Play size={19} className="ml-[1px]" />}
            </button>

            <button
              type="button"
              onClick={playNext}
              className="
                inline-flex h-9 w-9 items-center justify-center rounded-full
                text-white/72 transition-colors hover:text-[#00FFC6]
              "
              aria-label="Next"
            >
              <SkipForward size={19} />
            </button>
          </div>
        </div>
      ) : (
        <MobileFullscreenPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          progress={progress}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          onClose={() => setMobileExpanded(false)}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onVolumeChange={(value) => {
            setVolume(value);
            if (value === 0) {
              setIsMuted(true);
            } else {
              setIsMuted(false);
              setLastVolumeBeforeMute(value);
            }
          }}
          onToggleMute={toggleMute}
          onToggleShuffle={toggleShuffle}
          onPrev={playPrev}
          onNext={playNext}
          onGoToTrack={goToTrack}
          onGoToArtist={goToArtist}
        />
      )}
    </>
  );
}
