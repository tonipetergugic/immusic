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
    <div className="px-2 py-1 space-y-3">
      <div>
        <p className="text-xs text-[#B3B3B3]">Avg rating</p>
        <p className="text-sm font-semibold tabular-nums">
          {track.rating_avg === null ? "—" : track.rating_avg.toFixed(2)}
          <span className="text-xs text-[#B3B3B3]"> · {track.ratings_count}</span>
        </p>
      </div>

      <div className="space-y-2.5 pt-1 border-t border-white/10">
        {breakdownRows.map(({ stars, count }) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const pctRounded = Math.round(pct);
          return (
            <div key={stars} className="flex items-center gap-2 min-w-0">
              <span className="w-8 shrink-0 text-xs text-[#B3B3B3] tabular-nums">
                {stars}★
              </span>
              <div className="flex-1 min-w-0 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/35"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-white/80 w-8 text-right">
                {pctRounded}%
              </span>
              <span className="shrink-0 text-[11px] text-[#B3B3B3] tabular-nums w-8 text-right">
                ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
