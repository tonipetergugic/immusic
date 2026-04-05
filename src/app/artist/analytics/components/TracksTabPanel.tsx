"use client";

import TrackDetailsPanel from "./TrackDetailsPanel";
import TopTracksPanel from "./TopTracksPanel";
import TracksTabHeader from "./TracksTabHeader";
import type { Range, TopTrackRow, TrackDetailsRow } from "../types";

type Props = {
  activeRange: Range;
  trackSort: "streams" | "listeners" | "rating" | "time";
  topTracks: TopTrackRow[];
  selectedTrackId: string | null;
  selectedTrack: TrackDetailsRow | null;
  onSelectTrack: (trackId: string) => void;
  onTrackSortChange: (value: "streams" | "listeners" | "rating" | "time") => void;
};

export default function TracksTabPanel({
  activeRange,
  trackSort,
  topTracks,
  selectedTrackId,
  selectedTrack,
  onSelectTrack,
  onTrackSortChange,
}: Props) {
  return (
    <div className="mt-8 space-y-5">
      <TracksTabHeader
        activeRange={activeRange}
        trackSort={trackSort}
        onTrackSortChange={onTrackSortChange}
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] xl:items-start">
        <TopTracksPanel
          topTracks={topTracks}
          selectedTrackId={selectedTrackId}
          onSelectTrack={onSelectTrack}
        />

        <div className="xl:border-l xl:border-white/10 xl:pl-8">
          <TrackDetailsPanel track={selectedTrack} />
        </div>
      </div>
    </div>
  );
}
