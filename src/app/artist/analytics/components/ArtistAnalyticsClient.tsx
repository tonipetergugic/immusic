"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AnalyticsHeader from "./AnalyticsHeader";
import AudienceTabPanel from "./AudienceTabPanel";
import AnalyticsTabs from "./AnalyticsTabs";
import OverviewTabPanel from "./OverviewTabPanel";
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

type Tab = "Overview" | "Audience" | "Tracks" | "Conversion";

export default function ArtistAnalyticsClient(props: {
  initialTab: Tab;
  initialRange: Range;
  initialTrackSort: "streams" | "listeners" | "rating" | "time";
  summary: ArtistAnalyticsSummary;
  topTracks: TopTrackRow[];
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
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
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

  const trackIndexById = useMemo(() => {
    return Object.fromEntries(
      props.topTracks.map((track) => [track.track_id, track])
    ) as Record<string, TopTrackRow>;
  }, [props.topTracks]);

  useEffect(() => {
    if (!selectedTrackId) return;
    if (!trackIndexById[selectedTrackId]) {
      setSelectedTrackId(null);
    }
  }, [selectedTrackId, trackIndexById]);

  useEffect(() => {
    if (activeTab !== "Tracks") return;
    if (props.topTracks.length === 0) return;

    const firstTrackId = props.topTracks[0]?.track_id ?? null;
    if (!firstTrackId) return;

    if (!selectedTrackId || !trackIndexById[selectedTrackId]) {
      setSelectedTrackId(firstTrackId);
    }
  }, [activeTab, props.topTracks, selectedTrackId, trackIndexById]);

  const selectedTrack: TrackDetailsRow | null =
    selectedTrackId && trackIndexById[selectedTrackId]
      ? props.trackDetailsById[selectedTrackId] ?? null
      : null;

  return (
    <div className="space-y-6">
      <AnalyticsHeader activeRange={activeRange} onRangeChange={handleRangeChange} />
      <AnalyticsTabs value={activeTab} onChange={handleTabChange} />

      {activeTab === "Overview" && (
        <OverviewTabPanel
          activeRange={activeRange}
          summary={props.summary}
          followersCount={props.followersCount}
          savesCount={props.savesCount}
          conversionPct={props.conversionPct}
        />
      )}

      {activeTab === "Audience" && (
        <AudienceTabPanel countryListeners30d={props.countryListeners30d} />
      )}

      {activeTab === "Tracks" && (
        <TracksTabPanel
          activeRange={activeRange}
          trackSort={trackSort}
          topTracks={props.topTracks}
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
