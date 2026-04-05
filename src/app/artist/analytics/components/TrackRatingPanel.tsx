"use client";

import type { TrackDetailsRow, Range } from "../types";

type Props = {
  track: TrackDetailsRow;
  activeRange: Range;
};

/** Avg rating + Ratings count (Grid-Zelle). */
export default function TrackRatingPanel(props: Props) {
  const { track } = props;

  const total = track.ratings_count;
  const breakdownRows = [
    { stars: 5, count: track.rating_5_count },
    { stars: 4, count: track.rating_4_count },
    { stars: 3, count: track.rating_3_count },
    { stars: 2, count: track.rating_2_count },
    { stars: 1, count: track.rating_1_count },
  ] as const;

  return (
    <div className="min-w-0">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {track.title}
        </h2>

        <div className="mt-6">
          <p className="text-6xl font-semibold tracking-[-0.04em] text-white tabular-nums leading-none">
            {track.rating_avg === null ? "—" : track.rating_avg.toFixed(2)}
          </p>
          <p className="mt-3 text-lg font-medium tracking-tight text-white/55">
            based on {track.ratings_count} ratings
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
        {breakdownRows.map(({ stars, count }) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const pctRounded = Math.round(pct);

          return (
            <div
              key={stars}
              className="grid grid-cols-[42px_minmax(0,1fr)_48px_32px] items-center gap-4"
            >
              <span className="text-sm tabular-nums text-white/55">
                {stars}★
              </span>

              <div className="h-2 min-w-0 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[#00FFC6]"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <span className="text-right text-sm tabular-nums text-white/70">
                {pctRounded}%
              </span>

              <span className="text-right text-xs tabular-nums text-white/45">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
