"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import AnalyticsHeader from "./AnalyticsHeader";
import StatCard from "./StatCard";
import WorldMapCard from "./WorldMapCard";
import AnalyticsTabs from "./AnalyticsTabs";
import StreamsOverTimeChart from "./StreamsOverTimeChart";

type Tab = "Overview" | "Audience" | "Tracks" | "Conversion";
export type Range = "7d" | "28d" | "all";

export type StreamsPoint = { day: string; streams: number };
export type ListenersPoint = { day: string; listeners: number };

export type ArtistAnalyticsSummary = {
  range: Range;
  from: string;
  streams_over_time: StreamsPoint[];
  listeners_over_time: ListenersPoint[];
  unique_listeners_total: number;
};

export type TopTrackRow = {
  track_id: string;
  title: string;
  cover_url: string | null;
  streams: number;
  unique_listeners: number;
  listened_seconds: number;
  ratings_count: number;
  rating_avg: number | null;
};

export type CountryListeners30dRow = {
  country_iso2: string;     // ISO2 only (DE, US, ES, ...)
  listeners_30d: number;    // rolling 30d
};

export type TopConvertingTrackRow = {
  track_id: string;
  title: string;
  cover_url: string | null;
  listeners: number;
  saves: number;
  conversion_pct: number;
};

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

type RangeLabel = { badge: string; subtitle: string; metricSuffix: string };

function getRangeLabel(r: "7d" | "28d" | "all"): RangeLabel {
  if (r === "7d") return { badge: "7d", subtitle: "last 7 days", metricSuffix: "(7d)" };
  if (r === "28d") return { badge: "28d", subtitle: "last 28 days", metricSuffix: "(28d)" };
  return { badge: "All time", subtitle: "all time", metricSuffix: "(all time)" };
}

export default function ArtistAnalyticsClient(props: {
  artistId: string;
  initialTab: Tab;
  initialRange: Range;
  initialTrackSort: "streams" | "listeners" | "rating" | "time";
  summary: ArtistAnalyticsSummary;
  topTracks: TopTrackRow[];
  topRatedTracks: TopTrackRow[];
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

  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl);
  const [activeRange, setActiveRange] = useState<Range>(rangeFromUrl);
  const [trackSort, setTrackSort] = useState<"streams" | "listeners" | "rating" | "time">(props.initialTrackSort);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  useEffect(() => {
    setTrackSort(props.initialTrackSort);
  }, [props.initialTrackSort]);

  // URL ist Quelle der Wahrheit (Navigation triggert Server-Render)
  // State nur für UI-Responsiveness; wir navigieren bei Änderungen.
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab.toLowerCase());
    router.replace(`${pathname}?${next.toString()}`);
  };

  const handleRangeChange = (range: Range) => {
    setActiveRange(range);
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", range);
    router.replace(`${pathname}?${next.toString()}`);
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
  const countryListeners30d = props.countryListeners30d;

  const selectedTrack = selectedTrackId
    ? topTracks.find((t) => t.track_id === selectedTrackId) ?? null
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
              <select
                value={trackSort}
                onChange={(e) => handleTrackSortChange(e.target.value as "streams" | "listeners" | "rating" | "time")}
                className="cursor-pointer px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="streams">Streams</option>
                <option value="listeners">Unique listeners</option>
                <option value="rating">Avg rating</option>
                <option value="time">Listening time</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold">Top tracks</p>

                  <div className="ml-auto flex items-center gap-6 text-xs text-[#B3B3B3]">
                    <div className="w-14 text-right">Streams</div>
                    <div className="w-14 text-right">Listeners</div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/10">
                {topTracks.length === 0 && (
                  <div className="px-4 md:px-5 py-3 text-xs text-[#B3B3B3]">No data yet.</div>
                )}

                {topTracks.map((t, idx) => (
                  <div
                    key={t.track_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTrackId(t.track_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedTrackId(t.track_id);
                    }}
                    className={[
                      "cursor-pointer px-4 md:px-5 py-3 flex items-center gap-4 transition",
                      selectedTrackId === t.track_id ? "bg-white/10" : "hover:bg-white/5",
                    ].join(" ")}
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

                    <div className="hidden md:flex items-center gap-6">
                      <div className="w-14 text-right text-sm text-white/90 tabular-nums">
                        {formatInt(t.streams)}
                      </div>
                      <div className="w-14 text-right text-sm text-[#00FFC6] tabular-nums">
                        {formatInt(t.unique_listeners)}
                      </div>
                    </div>

                    <div className="md:hidden text-sm text-[#00FFC6] tabular-nums">
                      {formatInt(t.streams)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Track details</p>
                </div>

                {!selectedTrack ? (
                  <div className="mt-3 min-h-[88px]">
                    <p className="text-sm text-[#B3B3B3]">
                      Select a track to see details.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-10 w-10 rounded-md bg-white/10 overflow-hidden shrink-0">
                        {selectedTrack.cover_url ? (
                          <Image
                            src={selectedTrack.cover_url}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{selectedTrack.title}</p>
                        {(() => {
                          const r = getRangeLabel(activeRange);
                          return (
                            <p className="text-xs text-[#B3B3B3]">
                              Based on {r.subtitle}
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="h-px w-full bg-white/10" />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="px-2 py-1">
                        <p className="text-xs text-[#B3B3B3]">Streams</p>
                        <p className="text-sm font-semibold tabular-nums">{formatInt(selectedTrack.streams)}</p>
                      </div>

                      <div className="px-2 py-1">
                        <p className="text-xs text-[#B3B3B3]">Unique listeners</p>
                        <p className="text-sm font-semibold tabular-nums">{formatInt(selectedTrack.unique_listeners)}</p>
                      </div>

                      <div className="px-2 py-1">
                        <p className="text-xs text-[#B3B3B3]">Listening time</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {Math.round((selectedTrack.listened_seconds ?? 0) / 60)} min
                        </p>
                      </div>

                      <div className="px-2 py-1">
                        <p className="text-xs text-[#B3B3B3]">Avg rating</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {selectedTrack.rating_avg === null ? "—" : selectedTrack.rating_avg.toFixed(2)}
                          <span className="text-xs text-[#B3B3B3]"> · {selectedTrack.ratings_count}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <p className="text-sm font-semibold mb-3">Top rated</p>
                <div className="divide-y divide-white/10">
                  {topRatedTracks.length === 0 && (
                    <div className="px-4 md:px-5 py-3 text-xs text-[#B3B3B3]">No data yet.</div>
                  )}

                  {topRatedTracks.slice(0, 5).map((t, idx) => (
                    <div key={t.track_id} className="px-4 md:px-5 py-3 flex items-center gap-3">
                      <div className="w-8 text-xs text-[#B3B3B3]">{idx + 1}</div>

                      <div className="relative h-9 w-9 rounded-md bg-white/10 overflow-hidden shrink-0">
                        {t.cover_url ? (
                          <Image
                            src={t.cover_url}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-[#B3B3B3]">
                          Avg rating · {t.ratings_count} ratings
                        </p>
                      </div>

                      <div className="text-sm text-[#00FFC6] tabular-nums">
                        {t.rating_avg === null ? "-" : t.rating_avg.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
