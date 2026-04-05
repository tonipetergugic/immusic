"use client";

import type { TrackDetailsRow, Range } from "../types";
import { getRangeLabel } from "../_lib/analyticsRangeLabel";

/** „Based on …“-Zeile (zuvor direkt unter dem Titel). */
export function TrackRatingBasedOnLine({ activeRange }: { activeRange: Range }) {
  const r = getRangeLabel(activeRange);
  return (
    <p className="text-xs text-[#B3B3B3]">
      Based on {r.subtitle}
    </p>
  );
}

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
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
          Avg rating
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
          {track.rating_avg === null ? "—" : track.rating_avg.toFixed(2)}
          <span className="ml-2 text-sm font-medium text-white/50">
            · {track.ratings_count}
          </span>
        </p>
      </div>

      <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
        {breakdownRows.map(({ stars, count }) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const pctRounded = Math.round(pct);

          return (
            <div key={stars} className="grid grid-cols-[38px_minmax(0,1fr)_42px_40px] items-center gap-3">
              <span className="text-xs tabular-nums text-white/55">
                {stars}★
              </span>

              <div className="h-1.5 min-w-0 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-[#00FFC6]"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <span className="text-right text-xs tabular-nums text-white/70">
                {pctRounded}%
              </span>

              <span className="text-right text-[11px] tabular-nums text-white/45">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
