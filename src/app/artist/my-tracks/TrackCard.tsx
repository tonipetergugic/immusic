"use client";

import { useRouter } from "next/navigation";
import { Music, Check, AlertTriangle } from "lucide-react";
import { formatTrackTitle } from "@/lib/formatTrackTitle";

type Track = {
  id: string;
  title: string;
  version: string | null;
  audio_path: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  has_lyrics: boolean;
  is_explicit: boolean;
  artist_id: string;
  status: "approved" | "development" | "performance";
  isLocked?: boolean;
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

  const isLocked = Boolean(track.isLocked);

  return (
    <div
      className={
        "group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#131317] transition " +
        (isLocked
          ? "cursor-pointer opacity-55 hover:border-[#00FFC6]/20 hover:bg-[#16161b]"
          : "cursor-pointer hover:border-[#00FFC6]/35 hover:bg-[#16161b] hover:shadow-[0_0_0_1px_rgba(0,255,198,0.18),0_0_20px_rgba(0,255,198,0.08)]")
      }
      role="button"
      tabIndex={0}
      onClick={() => {
        router.push(`/artist/my-tracks/${track.id}/edit`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/artist/my-tracks/${track.id}/edit`);
        }
      }}
    >
      <div className="relative aspect-[5/4] w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,198,0.12),transparent_42%),linear-gradient(145deg,#17171c_0%,#101014_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.42),rgba(0,0,0,0.06)_42%,transparent_68%)]" />

        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {isLocked ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/70">
              Locked by published release
            </span>
          ) : isComplete ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CFFE9]/80">
                Metadata complete
              </span>
              <div
                className="shrink-0 text-[#00FFC6]/90 drop-shadow-[0_0_6px_rgba(0,255,198,0.28)]"
                aria-label="Complete"
                title="Complete"
              >
                <Check size={20} strokeWidth={2.6} />
              </div>
            </>
          ) : (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/70">
                Need metadata
              </span>
              <div
                className="shrink-0 text-amber-300/90"
                aria-label="Incomplete"
                title="Incomplete"
              >
                <AlertTriangle size={20} />
              </div>
            </>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] shadow-[0_12px_34px_rgba(0,0,0,0.28)] transition group-hover:scale-[1.03]">
            <Music size={32} className="text-white/42" />
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4">
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold leading-6 text-white">
              {formatTrackTitle(track.title, track.version)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

