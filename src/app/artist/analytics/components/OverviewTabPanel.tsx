"use client";

import StatCard from "./StatCard";
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Streams"
          value={formatInt(liveStreamsTotal)}
        />

        <StatCard
          label="Listeners"
          value={formatInt(uniqueListenersTotal)}
        />

        <StatCard
          label="Track saves"
          value={formatInt(savesCount)}
        />

        <StatCard
          label="Followers"
          value={formatInt(followersCount)}
        />

        <StatCard
          label="Conversion"
          value={
            Number.isFinite(conversionPct)
              ? `${conversionPct.toFixed(1)}%`
              : "—"
          }
        />
      </div>

      <div className="mt-8 min-h-[360px]">
        <StreamsOverTimeChart range={activeRange} points={summary.streams_over_time} />
      </div>
    </>
  );
}
