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
    <section className="pt-1">
      <div className="border-b border-white/10 pb-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
          Ranking
        </div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Top rated
        </h3>
      </div>

      <div className="divide-y divide-white/10">
        {topRatedTracks.length === 0 && (
          <div className="py-4 text-sm text-white/55">No data yet.</div>
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
              "cursor-pointer flex items-center gap-3 py-4 transition",
              selectedTrackId === t.track_id ? "bg-white/[0.04]" : "hover:bg-white/[0.025]",
            ].join(" ")}
          >
            <div className="w-8 text-xs text-white/40">{idx + 1}</div>

            <div className="relative h-10 w-10 overflow-hidden rounded-md bg-white/10 shrink-0">
              {t.cover_url ? (
                <Image
                  src={t.cover_url}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{t.title}</p>
              <p className="mt-1 text-xs text-white/45">
                Avg rating · {t.ratings_count} ratings
              </p>
            </div>

            <div className="text-sm font-medium tabular-nums text-[#00FFC6]">
              {t.rating_avg === null ? "—" : t.rating_avg.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
