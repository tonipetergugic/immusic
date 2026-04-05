"use client";

import AppSelect from "@/components/AppSelect";
import type { Range } from "../types";
import { getRangeLabel } from "../_lib/analyticsRangeLabel";

const TRACK_SORT_ITEMS = [
  { value: "streams", label: "Streams" },
  { value: "listeners", label: "Unique listeners" },
  { value: "rating", label: "Avg rating" },
  { value: "time", label: "Listening time" },
];

type Props = {
  activeRange: Range;
  trackSort: "streams" | "listeners" | "rating" | "time";
  onTrackSortChange: (value: "streams" | "listeners" | "rating" | "time") => void;
};

export default function TracksTabHeader({
  activeRange,
  trackSort,
  onTrackSortChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[30px] font-semibold tracking-tight text-white">Track performance</p>
        {(() => {
          const r = getRangeLabel(activeRange);
          return (
            <p className="text-sm text-[#B3B3B3] mt-1">
              Your best performing tracks ({r.subtitle})
            </p>
          );
        })()}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[#B3B3B3] shrink-0">Sort:</label>
        <div className="w-[210px]">
          <AppSelect
            value={trackSort}
            onChange={(value) =>
              onTrackSortChange(value as "streams" | "listeners" | "rating" | "time")
            }
            items={TRACK_SORT_ITEMS}
            className="[&>button]:h-[42px] [&>button]:rounded-xl [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:px-3 [&>button]:py-2 [&>button]:text-sm [&>button]:text-white [&>button]:hover:bg-white/10 [&>button]:focus:ring-1 [&>button]:focus:ring-white/20 [&>button_svg]:text-white/55"
          />
        </div>
      </div>
    </div>
  );
}
