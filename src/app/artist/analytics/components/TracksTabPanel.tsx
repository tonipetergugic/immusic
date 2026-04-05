"use client";

import AppSelect from "@/components/AppSelect";
import TrackDetailsPanel from "./TrackDetailsPanel";
import TopRatedTracksPanel from "./TopRatedTracksPanel";
import TopTracksPanel from "./TopTracksPanel";
import type { Range, TopTrackRow, TrackDetailsRow } from "../types";
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
  topTracks: TopTrackRow[];
  topRatedTracks: TopTrackRow[];
  selectedTrackId: string | null;
  selectedTrack: TrackDetailsRow | null;
  onSelectTrack: (trackId: string) => void;
  onTrackSortChange: (value: "streams" | "listeners" | "rating" | "time") => void;
};

export default function TracksTabPanel({
  activeRange,
  trackSort,
  topTracks,
  topRatedTracks,
  selectedTrackId,
  selectedTrack,
  onSelectTrack,
  onTrackSortChange,
}: Props) {
  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold">Track performance</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <TopTracksPanel
          topTracks={topTracks}
          selectedTrackId={selectedTrackId}
          onSelectTrack={onSelectTrack}
        />

        <div className="space-y-4">
          <TrackDetailsPanel track={selectedTrack} activeRange={activeRange} />

          <TopRatedTracksPanel
            topRatedTracks={topRatedTracks}
            selectedTrackId={selectedTrackId}
            onSelectTrack={onSelectTrack}
          />
        </div>
      </div>
    </div>
  );
}
