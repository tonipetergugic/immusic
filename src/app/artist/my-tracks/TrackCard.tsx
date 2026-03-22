"use client";

import { } from "react";
import { useRouter } from "next/navigation";
import { Music, Check, AlertTriangle } from "lucide-react";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

type Track = {
  id: string;
  title: string;
  version: string | null;
  audio_path: string;
  queue_id?: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  has_lyrics: boolean;
  is_explicit: boolean;
  artist_id: string;
  status: "approved" | "development" | "performance";
};

type TrackCardProps = {
  track: Track;
};

export function TrackCard({ track }: TrackCardProps) {
  const router = useRouter();

  const isComplete =
    Boolean(track?.version) &&
    Boolean(track?.bpm) &&
    Boolean(track?.key) &&
    Boolean(track?.genre) &&
    typeof track?.has_lyrics === "boolean" &&
    typeof track?.is_explicit === "boolean";

  const isLocked = Boolean((track as any).isLocked);

  return (
    <div
      className={
        "group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] transition " +
        (isLocked
          ? "cursor-not-allowed opacity-55"
          : "cursor-pointer hover:border-[#00FFC6]/30 hover:bg-white/[0.045] hover:shadow-[0_0_0_1px_rgba(0,255,198,0.18),0_0_18px_rgba(0,255,198,0.08)]")
      }
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isLocked) return;
        router.push(`/artist/my-tracks/${track.id}/edit`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isLocked) return;
          router.push(`/artist/my-tracks/${track.id}/edit`);
        }
      }}
    >
      <div className="relative aspect-square w-full border border-white/10 bg-[#141418]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00FFC6]/8 via-transparent to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_40px_rgba(0,0,0,0.25)]">
            <Music size={38} className="text-white/50" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="rounded-[20px] border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold tracking-tight text-white">
                  {formatTrackTitle(track.title, track.version)}
                </div>
              </div>

              {isComplete ? (
                <div
                  className="shrink-0 text-[#00FFC6] drop-shadow-[0_0_8px_rgba(0,255,198,0.55)]"
                  aria-label="Complete"
                  title="Complete"
                >
                  <Check size={22} strokeWidth={2.6} />
                </div>
              ) : (
                <div
                  className="shrink-0 text-amber-300"
                  aria-label="Incomplete"
                  title="Incomplete"
                >
                  <AlertTriangle size={22} />
                </div>
              )}
            </div>

            {isLocked && (
              <div className="mt-3 text-xs font-medium text-amber-200/90">
                Locked by published release
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

