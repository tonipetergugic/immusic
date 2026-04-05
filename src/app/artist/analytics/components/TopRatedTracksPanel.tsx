"use client";

import Image from "next/image";
import type { TopTrackRow } from "../types";

type Props = {
  topRatedTracks: TopTrackRow[];
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
};

export default function TopRatedTracksPanel({
  topRatedTracks,
  selectedTrackId,
  onSelectTrack,
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <p className="text-sm font-semibold mb-3">Top rated</p>
      <div className="divide-y divide-white/10">
        {topRatedTracks.length === 0 && (
          <div className="px-4 md:px-5 py-3 text-xs text-[#B3B3B3]">No data yet.</div>
        )}

        {topRatedTracks.slice(0, 5).map((t, idx) => (
          <div
            key={t.track_id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectTrack(t.track_id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectTrack(t.track_id);
            }}
            className={[
              "cursor-pointer px-4 md:px-5 py-3 flex items-center gap-3 transition",
              selectedTrackId === t.track_id ? "bg-white/10" : "hover:bg-white/5",
            ].join(" ")}
          >
            <div className="w-8 text-xs text-[#B3B3B3]">{idx + 1}</div>

            <div className="relative h-9 w-9 rounded-md bg-white/10 overflow-hidden shrink-0">
              {t.cover_url ? (
                <Image
                  src={t.cover_url}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{t.title}</p>
              <p className="text-xs text-[#B3B3B3]">
                Avg rating · {t.ratings_count} ratings
              </p>
            </div>

            <div className="text-sm text-[#00FFC6] tabular-nums">
              {t.rating_avg === null ? "-" : t.rating_avg.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
