"use client";

import Image from "next/image";
import type { Range, TrackDetailsRow } from "../types";
import TrackRatingPanel, { TrackRatingBasedOnLine } from "./TrackRatingPanel";

type Props = {
  track: TrackDetailsRow | null;
  activeRange: Range;
};

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

export default function TrackDetailsPanel({ track, activeRange }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Track details</p>
      </div>

      {!track ? (
        <div className="mt-3 min-h-[88px]">
          <p className="text-sm text-[#B3B3B3]">
            Select a track to see details.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-10 w-10 rounded-md bg-white/10 overflow-hidden shrink-0">
              {track.cover_url ? (
                <Image
                  src={track.cover_url}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{track.title}</p>
              <TrackRatingBasedOnLine activeRange={activeRange} />
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="grid grid-cols-2 gap-3">
            <div className="px-2 py-1">
              <p className="text-xs text-[#B3B3B3]">Streams</p>
              <p className="text-sm font-semibold tabular-nums">{formatInt(track.streams)}</p>
            </div>

            <div className="px-2 py-1">
              <p className="text-xs text-[#B3B3B3]">Unique listeners</p>
              <p className="text-sm font-semibold tabular-nums">{formatInt(track.unique_listeners)}</p>
            </div>

            <div className="px-2 py-1">
              <p className="text-xs text-[#B3B3B3]">Listening time</p>
              <p className="text-sm font-semibold tabular-nums">
                {Math.round((track.listened_seconds ?? 0) / 60)} min
              </p>
            </div>

            <TrackRatingPanel track={track} activeRange={activeRange} />
          </div>
        </div>
      )}
    </div>
  );
}
