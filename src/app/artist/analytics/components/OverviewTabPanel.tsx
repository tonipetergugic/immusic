"use client";

import StreamsOverTimeChart from "./StreamsOverTimeChart";
import type { ArtistAnalyticsSummary, Range } from "../types";

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

type Props = {
  activeRange: Range;
  summary: ArtistAnalyticsSummary;
  followersCount: number;
  savesCount: number;
  conversionPct: number;
};

export default function OverviewTabPanel({
  activeRange,
  summary,
  followersCount,
  savesCount,
  conversionPct,
}: Props) {
  const liveStreamsTotal =
    summary?.streams_over_time?.reduce((acc, p) => acc + (p.streams || 0), 0) ?? 0;

  const uniqueListenersTotal = summary?.unique_listeners_total ?? 0;

  return (
    <>
      <section className="border-b border-white/10 pb-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 xl:grid-cols-5">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Streams
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {formatInt(liveStreamsTotal)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Listeners
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {formatInt(uniqueListenersTotal)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Track saves
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {formatInt(savesCount)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Followers
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {formatInt(followersCount)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Conversion
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
{Number.isFinite(conversionPct) ? `${Math.round(conversionPct)}%` : "—"}
            </div>
          </div>
        </div>
      </section>

      <div className="pt-8">
        <StreamsOverTimeChart range={activeRange} points={summary.streams_over_time} />
      </div>
    </>
  );
}
