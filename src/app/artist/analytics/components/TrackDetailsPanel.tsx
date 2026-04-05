"use client";

import type { Range, TrackDetailsRow } from "../types";
import TrackRatingPanel from "./TrackRatingPanel";

type Props = {
  track: TrackDetailsRow | null;
  activeRange: Range;
};

export default function TrackDetailsPanel({ track, activeRange }: Props) {
  return (
    <section>
      {!track ? (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Select a track
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Select a track from the list to see rating details.
          </p>
        </div>
      ) : (
        <div>
          <TrackRatingPanel track={track} activeRange={activeRange} />
        </div>
      )}
    </section>
  );
}
