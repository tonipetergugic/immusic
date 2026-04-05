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
    <section className="border-b border-white/10 pb-8">
      {!track ? (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            Track details
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Select a track
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Select a track from the list to see performance and rating details.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-8 items-start">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Track details
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {track.title}
            </h2>

            <div className="mt-2">
              <TrackRatingBasedOnLine activeRange={activeRange} />
            </div>

            <div className="mt-6 space-y-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-md bg-white/10 shrink-0">
                  {track.cover_url ? (
                    <Image
                      src={track.cover_url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-white">
                    {track.title}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                  Streams
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {formatInt(track.streams)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                  Listening time
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {Math.round((track.listened_seconds ?? 0) / 60)} min
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                Unique listeners
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                {formatInt(track.unique_listeners)}
              </p>
            </div>

            <TrackRatingPanel track={track} activeRange={activeRange} />
          </div>
        </div>
      )}
    </section>
  );
}
