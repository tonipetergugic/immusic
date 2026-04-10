"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { ChevronDown, Pause, Play, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import TrackRatingInline from "@/components/TrackRatingInline";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import type { PlayerTrack } from "@/types/playerTrack";

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type MobileFullscreenPlayerProps = {
  currentTrack: PlayerTrack;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoToTrack: () => void;
  onGoToArtist: () => void;
};

export default function MobileFullscreenPlayer(props: MobileFullscreenPlayerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <FullscreenContent {...props} />,
    document.body
  );
}

function FullscreenContent({
  currentTrack,
  isPlaying,
  progress,
  duration,
  volume,
  isMuted,
  isShuffle,
  onClose,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onPrev,
  onNext,
  onGoToTrack,
  onGoToArtist,
}: MobileFullscreenPlayerProps) {
  const title = formatTrackTitle(currentTrack.title, currentTrack.version);

  return (
    <div className="fixed inset-0 z-60 md:hidden overflow-hidden bg-[#0B0B0D] text-white">
      {currentTrack.cover_url ? (
        <>
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-3xl"
            style={{ backgroundImage: `url(${currentTrack.cover_url})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,198,0.10),transparent_35%)]" aria-hidden="true" />
        </>
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#0B0B0D]/82 to-[#0B0B0D]" aria-hidden="true" />

      <div
        className="
          relative z-10 flex h-full flex-col
          px-5
          pt-[max(18px,calc(env(safe-area-inset-top)+6px))]
          pb-[max(20px,calc(env(safe-area-inset-bottom)+20px))]
        "
      >
        <div className="flex items-center justify-between gap-3 px-0.5">
          <button
            type="button"
            onClick={onClose}
            className="
              inline-flex h-11 w-11 items-center justify-center rounded-full
              border border-white/12 bg-black/30 text-white/90
              shadow-[0_10px_30px_rgba(0,0,0,0.28)]
              transition-colors hover:bg-white/10
            "
            aria-label="Collapse player"
          >
            <ChevronDown size={22} />
          </button>

          <div className="flex min-w-0 flex-col items-center text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/42">
              Now Playing
            </div>
            <div className="mt-1 text-[13px] font-medium text-white/72">
              Global Player
            </div>
          </div>

          <div className="h-11 w-11 shrink-0" aria-hidden="true" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pt-3">
          <div className="mx-auto w-full max-w-[430px] shrink-0">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/30 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
              <div className="aspect-square w-full max-h-[40vh] bg-neutral-950 p-3">
                {currentTrack.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-white/40">
                    No Cover
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[430px] min-h-0 shrink-0 pb-2">
            <div className="rounded-[28px] border border-white/10 bg-black/45 px-5 py-5 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col items-center text-center">
                {currentTrack.release_id ? (
                  <button
                    type="button"
                    onClick={onGoToTrack}
                    className="
                      block w-full max-w-[320px] truncate
                      text-[21px] font-semibold leading-[1.15] text-white/96
                      transition-colors hover:text-[#00FFC6]
                    "
                    title={title}
                  >
                    {title}
                  </button>
                ) : (
                  <div
                    className="w-full max-w-[320px] truncate text-[21px] font-semibold leading-[1.15] text-white/96"
                    title={title}
                  >
                    {title}
                  </div>
                )}

                {currentTrack?.profiles?.display_name ? (
                  <button
                    type="button"
                    onClick={onGoToArtist}
                    className="
                      mt-2 block w-full max-w-[280px] truncate
                      text-[15px] font-medium text-white/68
                      transition-colors hover:text-[#00FFC6]
                    "
                    title={currentTrack.profiles.display_name}
                  >
                    {currentTrack.profiles.display_name}
                  </button>
                ) : (
                  <div className="mt-2 w-full max-w-[280px] truncate text-[15px] font-medium text-white/48">
                    Unknown Artist
                  </div>
                )}

                <div className="mt-5 flex w-full justify-center">
                  <div className="scale-[1.2] origin-center">
                    <TrackRatingInline
                      trackId={currentTrack.id}
                      initialAvg={currentTrack.rating_avg ?? null}
                      initialCount={currentTrack.rating_count ?? 0}
                      initialStreams={(currentTrack as any).stream_count ?? 0}
                      initialMyStars={currentTrack.my_stars ?? null}
                      initialEligibility={
                        currentTrack.eligibility
                          ? {
                              window_open: currentTrack.eligibility.window_open ?? true,
                              can_rate: currentTrack.eligibility.can_rate ?? false,
                              listened_seconds:
                                currentTrack.eligibility.listened_seconds ?? 0,
                            }
                          : undefined
                      }
                      showStreamsOnDesktopOnly={false}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="px-0.5">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={progress}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="
                      h-[5px] w-full cursor-pointer rounded-full
                      bg-white/10 accent-[#00FFC6]
                    "
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[12px] font-medium tabular-nums tracking-[0.02em] text-white/62">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center">
                <div className="flex items-center justify-end gap-5 pr-3">
                  <button
                    type="button"
                    onClick={onToggleShuffle}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                      isShuffle
                        ? "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#00FFC6]"
                        : "border-white/8 bg-white/[0.03] text-white/72 hover:text-[#00FFC6]"
                    }`}
                    aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
                    title={isShuffle ? "Shuffle on" : "Shuffle off"}
                  >
                    <Shuffle size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={onPrev}
                    className="
                      inline-flex h-12 w-12 items-center justify-center rounded-full
                      text-white/84 transition-colors hover:text-[#00FFC6]
                    "
                    aria-label="Previous"
                  >
                    <SkipBack size={30} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="
                    justify-self-center
                    flex h-[72px] w-[72px] items-center justify-center rounded-full
                    border border-white/12 bg-[#151518] text-white/95
                    shadow-[0_14px_40px_rgba(0,0,0,0.38)]
                    transition-all hover:bg-[#00FFC6]/10 hover:text-[#00FFC6]
                  "
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-[2px]" />}
                </button>

                <div className="flex items-center justify-start gap-5 pl-3">
                  <button
                    type="button"
                    onClick={onNext}
                    className="
                      inline-flex h-12 w-12 items-center justify-center rounded-full
                      text-white/84 transition-colors hover:text-[#00FFC6]
                    "
                    aria-label="Next"
                  >
                    <SkipForward size={30} />
                  </button>

                  <div className="h-11 w-11 shrink-0 opacity-0 pointer-events-none" />
                </div>
              </div>

              <div className="mt-2 h-1 w-full" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
