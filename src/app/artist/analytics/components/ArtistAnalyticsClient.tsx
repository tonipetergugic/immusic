"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import AnalyticsHeader from "./AnalyticsHeader";
import StatCard from "./StatCard";
import WorldMapCard from "./WorldMapCard";
import AnalyticsTabs from "./AnalyticsTabs";
import StreamsOverTimeChart from "./StreamsOverTimeChart";
import TracksTabPanel from "./TracksTabPanel";
import { getRangeLabel } from "../_lib/analyticsRangeLabel";
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
        <div className="space-y-4">
          {/* Header like Track performance */}
          <div>
            <div className="text-lg font-semibold">Save performance</div>
            <div className="text-sm text-muted-foreground">
              {(() => {
                const r = getRangeLabel(activeRange);
                const label = r.badge ?? r.subtitle ?? String(activeRange);
                return <>Saves vs listeners ({label})</>;
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* LEFT: Big list card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden xl:col-span-2">
              <div className="px-4 md:px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  Top save ratio tracks
                </div>

                {/* column labels on desktop */}
                <div className="hidden md:flex items-center gap-6 text-xs text-[#B3B3B3]">
                  <div className="w-14 text-right">Saves</div>
                  <div className="w-14 text-right">Listeners</div>
                  <div className="w-16 text-right">Conv.</div>
                </div>
              </div>

              {props.topConvertingTracks.length === 0 ? (
                <div className="px-4 md:px-5 py-4 text-sm text-muted-foreground">
                  Not enough listener data yet.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {props.topConvertingTracks.map((t, idx) => (
                    <div
                      key={t.track_id}
                      className="px-4 md:px-5 py-3 flex items-center gap-4 transition-colors hover:bg-white/5"
                    >
                      <div className="w-10 text-xs text-[#B3B3B3]">{idx + 1}</div>

                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative h-10 w-10 rounded-md bg-white/10 overflow-hidden shrink-0">
                          {t.cover_url ? (
                            <Image
                              src={t.cover_url}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                        </div>
                      </div>

                      {/* Desktop columns */}
                      <div className="hidden md:flex items-center gap-6">
                        <div className="w-14 text-right text-sm text-white/90 tabular-nums">
                          {formatInt(t.saves)}
                        </div>
                        <div className="w-14 text-right text-sm text-white/90 tabular-nums">
                          {formatInt(t.listeners)}
                        </div>
                        <div className="w-16 text-right text-sm text-[#00FFC6] tabular-nums">
                          {Number.isFinite(t.conversion_pct)
                            ? `${t.conversion_pct.toFixed(1)}%`
                            : "—"}
                        </div>
                      </div>

                      {/* Mobile: show conversion only */}
                      <div className="md:hidden text-sm text-[#00FFC6] tabular-nums">
                        {Number.isFinite(t.conversion_pct)
                          ? `${t.conversion_pct.toFixed(1)}%`
                          : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: stacked cards */}
            <div className="grid gap-4 xl:col-span-1 xl:h-full xl:grid-rows-2">
              {/* Conversion summary card */}
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <div className="text-sm text-muted-foreground mb-1">
                  Save ratio
                </div>
                <div className="text-3xl font-semibold">
                  {Number.isFinite(props.conversionPct)
                    ? `${props.conversionPct.toFixed(1)}%`
                    : "—"}
                </div>

                <div className="mt-4 border-t border-white/5 pt-4">
                  <div className="text-sm text-muted-foreground mb-1">Saves</div>
                  <div className="text-2xl font-medium">{formatInt(props.savesCount)}</div>
                </div>
              </div>

              {/* How to read card */}
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <div className="text-[18px] font-semibold text-white mb-2">
                  How to read this
                </div>
                <ul className="text-[18px] text-[#B3B3B3] list-disc list-inside space-y-1">
                  <li>&lt; 5% → low save rate</li>
                  <li>5–10% → healthy save rate</li>
                  <li>&gt; 10% → very strong save rate</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
