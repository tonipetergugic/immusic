"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AnalyticsHeader from "./AnalyticsHeader";
import StatCard from "./StatCard";
import WorldMapCard from "./WorldMapCard";
import AnalyticsTabs from "./AnalyticsTabs";
import StreamsOverTimeChart from "./StreamsOverTimeChart";
import TracksTabPanel from "./TracksTabPanel";
import ConversionTabPanel from "./ConversionTabPanel";
import type {
  Range,
  ArtistAnalyticsSummary,
  TopTrackRow,
  TrackDetailsRow,
  CountryListeners30dRow,
  TopConvertingTrackRow,
} from "../types";

export type {
  Range,
  ArtistAnalyticsSummary,
  TopTrackRow,
  TrackDetailsRow,
  CountryListeners30dRow,
  TopConvertingTrackRow,
} from "../types";

type Tab = "Overview" | "Audience" | "Tracks" | "Conversion";

export type StreamsPoint = { day: string; streams: number };
export type ListenersPoint = { day: string; listeners: number };

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

export default function ArtistAnalyticsClient(props: {
  artistId: string;
  initialTab: Tab;
  initialRange: Range;
  initialTrackSort: "streams" | "listeners" | "rating" | "time";
  summary: ArtistAnalyticsSummary;
  topTracks: TopTrackRow[];
  topRatedTracks: TopTrackRow[];
  trackDetailsById: Record<string, TrackDetailsRow>;
  countryListeners30d: CountryListeners30dRow[];
  followersCount: number;
  savesCount: number;
  topConvertingTracks: TopConvertingTrackRow[];
  conversionPct: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = useMemo((): Tab => {
    const raw = (searchParams.get("tab") || props.initialTab).toLowerCase();
    if (raw === "audience") return "Audience";
    if (raw === "tracks") return "Tracks";
    if (raw === "conversion") return "Conversion";
    return "Overview";
  }, [searchParams, props.initialTab]);

  const rangeFromUrl = useMemo((): Range => {
    const raw = (searchParams.get("range") || props.initialRange).toLowerCase();
    if (raw === "7d") return "7d";
    if (raw === "all") return "all";
    return "28d";
  }, [searchParams, props.initialRange]);

  const activeTab = tabFromUrl;
  const [activeRange, setActiveRange] = useState<Range>(rangeFromUrl);
  const [trackSort, setTrackSort] = useState<"streams" | "listeners" | "rating" | "time">(props.initialTrackSort);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  useEffect(() => {
    setTrackSort(props.initialTrackSort);
  }, [props.initialTrackSort]);

  useEffect(() => {
    setActiveRange(rangeFromUrl);
  }, [rangeFromUrl]);

  // URL ist Quelle der Wahrheit (Navigation triggert Server-Render)
  // State nur für UI-Responsiveness; wir navigieren bei Änderungen.
  const handleTabChange = (tab: Tab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab.toLowerCase());
    window.history.replaceState(null, "", `${pathname}?${next.toString()}`);
  };

  const handleRangeChange = (range: Range) => {
    setActiveRange(range);
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", range);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const handleTrackSortChange = (newSort: "streams" | "listeners" | "rating" | "time") => {
    setTrackSort(newSort);
    const next = new URLSearchParams(searchParams.toString());
    next.set("sort", newSort);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const summary = props.summary;
  const topTracks = props.topTracks;
  const topRatedTracks = props.topRatedTracks;
  const trackDetailsById = props.trackDetailsById;
  const countryListeners30d = props.countryListeners30d;

  const trackIndexById = useMemo(() => {
    return Object.fromEntries(
      [...topTracks, ...topRatedTracks].map((track) => [track.track_id, track])
    ) as Record<string, TopTrackRow>;
  }, [topTracks, topRatedTracks]);

  useEffect(() => {
    if (!selectedTrackId) return;
    if (!trackIndexById[selectedTrackId]) {
      setSelectedTrackId(null);
    }
  }, [selectedTrackId, trackIndexById]);

  const selectedTrack: TrackDetailsRow | null =
    selectedTrackId && trackIndexById[selectedTrackId]
      ? trackDetailsById[selectedTrackId] ?? null
      : null;

  const liveStreamsTotal =
    summary?.streams_over_time?.reduce((acc, p) => acc + (p.streams || 0), 0) ?? 0;

  const uniqueListenersTotal = props.summary?.unique_listeners_total ?? 0;
  
  return (
    <div className="space-y-6">
      <AnalyticsHeader activeRange={activeRange} onRangeChange={handleRangeChange} />
      <AnalyticsTabs value={activeTab} onChange={handleTabChange} />

      {activeTab === "Overview" && (
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
              value={formatInt(props.savesCount)}
            />

            <StatCard
              label="Followers"
              value={formatInt(props.followersCount)}
            />

            <StatCard
              label="Conversion"
              value={
                Number.isFinite(props.conversionPct)
                  ? `${props.conversionPct.toFixed(1)}%`
                  : "—"
              }
            />
          </div>

          <div className="mt-8 min-h-[360px]">
            <StreamsOverTimeChart range={activeRange} points={props.summary.streams_over_time} />
          </div>
        </>
      )}

      {activeTab === "Audience" && (
        <div className="space-y-6">
          {/* Audience should be server-first + minimal: map + real top locations */}
          <WorldMapCard items={countryListeners30d} />
        </div>
      )}

      {activeTab === "Tracks" && (
        <TracksTabPanel
          activeRange={activeRange}
          trackSort={trackSort}
          topTracks={topTracks}
          topRatedTracks={topRatedTracks}
          selectedTrackId={selectedTrackId}
          selectedTrack={selectedTrack}
          onSelectTrack={setSelectedTrackId}
          onTrackSortChange={handleTrackSortChange}
        />
      )}

      {activeTab === "Conversion" && (
        <ConversionTabPanel
          activeRange={activeRange}
          topConvertingTracks={props.topConvertingTracks}
          savesCount={props.savesCount}
          conversionPct={props.conversionPct}
        />
      )}

    </div>
  );
}
