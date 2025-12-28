"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AnalyticsHeader from "./components/AnalyticsHeader";
import StatCard from "./components/StatCard";
import ChartCard from "./components/ChartCard";
import WorldMapCard from "./components/WorldMapCard";
import AnalyticsTabs from "./components/AnalyticsTabs";
import AnalyticsDrawer from "./components/AnalyticsDrawer";
import Tooltip from "@/components/Tooltip";

function ArtistAnalyticsPageInner() {
  type Tab = "Overview" | "Audience" | "Tracks" | "Conversion";

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = useMemo(() => {
    const raw = (searchParams.get("tab") || "overview").toLowerCase();
    if (raw === "audience") return "Audience";
    if (raw === "tracks") return "Tracks";
    if (raw === "conversion") return "Conversion";
    return "Overview";
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    const detail = searchParams.get("detail");
    if (detail) {
      setDrawerTitle(detail.replace(/-/g, " "));
      setDrawerOpen(true);
    }
  }, [searchParams]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab.toLowerCase());
    router.replace(`${pathname}?${next.toString()}`);
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("Details");
  const [drawerSubtitle, setDrawerSubtitle] = useState<string | undefined>(undefined);
  const [compareMode, setCompareMode] = useState(false);

  const openDrawer = (title: string, subtitle?: string) => {
    setDrawerTitle(title);
    setDrawerSubtitle(subtitle);
    setDrawerOpen(true);

    const next = new URLSearchParams(searchParams.toString());
    next.set("detail", title.toLowerCase().replace(/\s+/g, "-"));
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-6">
      <AnalyticsHeader />

      <AnalyticsTabs value={activeTab} onChange={handleTabChange} />

      {activeTab === "Overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Streams" value="128,430" delta="+12%" helper="vs previous period" />
            <StatCard label="Listeners" value="34,120" delta="+7%" helper="unique listeners" />
            <StatCard label="Saves" value="9,842" delta="+4%" helper="track + release saves" />
            <StatCard label="Followers" value="1,240" delta="+2%" helper="artist profile" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <ChartCard title="Streams over time" subtitle="Line preview (data later)" kind="line" onOpenDetails={openDrawer} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard title="Top tracks" subtitle="Bars preview (data later)" kind="bars" onOpenDetails={openDrawer} />
                <ChartCard title="Discovery sources" subtitle="Bars preview (data later)" kind="bars" onOpenDetails={openDrawer} />
              </div>
            </div>

            <div className="space-y-4">
              <ChartCard title="Conversion" subtitle="Saves per listener (preview)" kind="line" onOpenDetails={openDrawer} />
            </div>
          </div>
        </>
      )}

      {activeTab === "Audience" && (
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <WorldMapCard />
            <ChartCard
              title="Listeners over time"
              subtitle="Audience trend (preview)"
              kind="line"
              onOpenDetails={openDrawer}
            />
          </div>

          <div className="space-y-4">
            <ChartCard
              title="Top countries"
              subtitle="Country distribution (preview)"
              kind="bars"
              onOpenDetails={openDrawer}
            />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <p className="text-sm font-semibold">Top cities</p>
              <p className="text-xs text-[#B3B3B3] mt-1">UI preview</p>

              <div className="mt-4 space-y-3">
                {[
                  { city: "Berlin", value: "12%" },
                  { city: "London", value: "8%" },
                  { city: "Amsterdam", value: "6%" },
                  { city: "Hamburg", value: "5%" },
                  { city: "Madrid", value: "4%" },
                ].map((c) => (
                  <div
                    key={c.city}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <span className="text-sm text-white/90">{c.city}</span>
                    <span className="text-sm text-[#00FFC6]">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <ChartCard
              title="Devices"
              subtitle="Mobile vs Desktop vs Web (preview)"
              kind="bars"
              onOpenDetails={openDrawer}
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <p className="text-sm font-semibold">Age groups</p>
              <p className="text-xs text-[#B3B3B3] mt-1">UI preview</p>

              <div className="mt-4 space-y-3">
                {[
                  { label: "18–24", value: 32 },
                  { label: "25–34", value: 41 },
                  { label: "35–44", value: 16 },
                  { label: "45+", value: 11 },
                ].map((a) => (
                  <div key={a.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#B3B3B3]">{a.label}</span>
                      <span className="text-xs text-white/90">{a.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-[#00FFC6]/35"
                        style={{ width: `${a.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
              <p className="text-sm font-semibold">Gender</p>
              <p className="text-xs text-[#B3B3B3] mt-1">UI preview</p>

              <div className="mt-4 space-y-2">
                {[
                  { label: "Male", value: "62%" },
                  { label: "Female", value: "34%" },
                  { label: "Non-binary", value: "4%" },
                ].map((g) => (
                  <div
                    key={g.label}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <span className="text-sm text-white/90">{g.label}</span>
                    <span className="text-sm text-[#00FFC6]">{g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Tracks" && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">Track performance</p>
              <p className="text-sm text-[#B3B3B3] mt-1">
                Your best performing tracks (UI preview)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
                Sort: Streams
              </button>
              <button className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
                Last 28 days
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <p className="text-sm font-semibold">Top tracks</p>
                <p className="text-xs text-[#B3B3B3]">UI preview</p>
              </div>

              <div className="divide-y divide-white/10">
                {[
                  { title: "Come On in D Minor", streams: "12,430", saves: "842", rating: "3.2" },
                  { title: "Cosmic Puls", streams: "9,210", saves: "611", rating: "3.0" },
                  { title: "Dark Places", streams: "7,980", saves: "534", rating: "3.4" },
                  { title: "Come on now", streams: "6,120", saves: "401", rating: "2.9" },
                  { title: "Uplift Run", streams: "5,440", saves: "388", rating: "3.1" },
                ].map((t, idx) => (
                  <div
                    key={t.title}
                    className="px-4 md:px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition"
                  >
                    <div className="w-10 text-xs text-[#B3B3B3]">{idx + 1}</div>

                    <div className="h-10 w-10 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center text-xs text-[#B3B3B3]">
                      —
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-[#B3B3B3] mt-0.5">
                        Streams · Saves · Rating
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-sm text-white/90 tabular-nums">{t.streams}</div>
                      <div className="text-sm text-white/90 tabular-nums">{t.saves}</div>
                      <div className="text-sm text-[#00FFC6] tabular-nums">{t.rating}</div>
                    </div>

                    <div className="md:hidden text-sm text-[#00FFC6] tabular-nums">
                      {t.streams}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <ChartCard
                title="Streams trend"
                subtitle="Top tracks combined (preview)"
                kind="line"
                onOpenDetails={openDrawer}
              />
              <ChartCard
                title="Top rated"
                subtitle="Highest avg rating (preview)"
                kind="bars"
                onOpenDetails={openDrawer}
              />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <p className="text-sm font-semibold">Notes</p>
                <p className="text-xs text-[#B3B3B3] mt-1">
                  Later we’ll connect this to real track stats & ratings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Conversion" && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">Conversion funnel</p>
              <p className="text-sm text-[#B3B3B3] mt-1">
                How listeners turn into supporters (UI preview)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
                Last 28 days
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Listeners" value="34,120" delta="+7%" helper="reach" />
            <StatCard label="Saves" value="9,842" delta="+4%" helper="intent" />
            <StatCard label="Ratings" value="8" delta="+1" helper="feedback" />
            <StatCard label="Follows" value="1,240" delta="+2%" helper="long-term" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <ChartCard
                title="Conversion over time"
                subtitle="Saves / Listeners (preview)"
                kind="line"
                onOpenDetails={openDrawer}
              />

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <p className="text-sm font-semibold">Funnel steps</p>
                <p className="text-xs text-[#B3B3B3] mt-1">UI preview</p>

                <div className="mt-4 space-y-3">
                  {[
                    { label: "Listeners", value: 34120, pct: 100 },
                    { label: "Saved a track", value: 9842, pct: 29 },
                    { label: "Left a rating", value: 8, pct: 0.02 },
                    { label: "Followed artist", value: 1240, pct: 3.6 },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/90">{s.label}</span>
                        <span className="text-sm text-[#B3B3B3] tabular-nums">
                          {s.value.toLocaleString()} · {s.pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-[#00FFC6]/35"
                          style={{ width: `${Math.max(s.pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <ChartCard
                title="Breakdown"
                subtitle="Where conversions come from (preview)"
                kind="bars"
                onOpenDetails={openDrawer}
              />

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <p className="text-sm font-semibold">Insights</p>
                <p className="text-xs text-[#B3B3B3] mt-1">
                  Simple suggestions (UI preview)
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    { title: "Boost saves", text: "Add a short hook preview in your release description." },
                    { title: "Get more ratings", text: "Ask listeners for a rating after the drop moment." },
                    { title: "Improve follows", text: "Pin your best release on your artist profile." },
                  ].map((i) => (
                    <div
                      key={i.title}
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                    >
                      <p className="text-sm font-medium">{i.title}</p>
                      <p className="text-xs text-[#B3B3B3] mt-1">{i.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnalyticsDrawer
        open={drawerOpen}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        onClose={() => {
          setDrawerOpen(false);
          setCompareMode(false);
          const next = new URLSearchParams(searchParams.toString());
          next.delete("detail");
          router.replace(`${pathname}?${next.toString()}`);
        }}
      >
        <div className="space-y-5">
          {compareMode && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Compare mode</p>
              <p className="text-xs text-[#B3B3B3] mt-1">
                Comparing: Last 28 days vs Previous 28 days (UI preview)
              </p>
            </div>
          )}

          {drawerTitle.toLowerCase().includes("conversion") && (
            <div className="rounded-2xl border border-[#00FFC6]/20 bg-[#00FFC6]/5 p-4">
              <p className="text-sm font-semibold">Conversion focus</p>
              <p className="text-xs text-[#B3B3B3] mt-1">
                Showing conversion-related segments (UI preview)
              </p>
            </div>
          )}

          {drawerTitle.toLowerCase().includes("streams") && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Streams focus</p>
              <p className="text-xs text-[#B3B3B3] mt-1">
                Showing stream sources & trend details (UI preview)
              </p>
            </div>
          )}

          {!drawerTitle.toLowerCase().includes("conversion") &&
            !drawerTitle.toLowerCase().includes("streams") && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">Details</p>
                <p className="text-xs text-[#B3B3B3] mt-1">
                  Showing breakdown for this metric (UI preview)
                </p>
              </div>
            )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">KPI snapshot</p>
                <p className="text-xs text-[#B3B3B3] mt-1">UI preview</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-black/20 text-[#B3B3B3]">
                Live later
              </span>
            </div>

            <div className={`mt-4 grid ${compareMode ? "grid-cols-2" : "grid-cols-2"} gap-3`}>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-[#B3B3B3]">Value</p>
                <p className="text-lg font-semibold mt-1">128,430</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-[#B3B3B3]">Change</p>
                <p className="text-lg font-semibold mt-1 text-[#00FFC6]">+12%</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-[#B3B3B3]">Avg / day</p>
                <p className="text-lg font-semibold mt-1">4,210</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs text-[#B3B3B3]">Peak</p>
                <p className="text-lg font-semibold mt-1">9,881</p>
              </div>
            </div>
          </div>

          {compareMode && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold">Comparison snapshot</p>
              <p className="text-xs text-[#B3B3B3] mt-1">UI preview</p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-[#B3B3B3]">Value (previous)</p>
                  <p className="text-lg font-semibold mt-1">114,902</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs text-[#B3B3B3]">Change vs current</p>
                  <p className="text-lg font-semibold mt-1 text-[#00FFC6]">-10.5%</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Chart</p>
                <p className="text-xs text-[#B3B3B3] mt-1">
                  Bigger view (UI preview)
                </p>
              </div>
              <Tooltip label="Coming soon" placement="bottom">
                <button
                  type="button"
                  onClick={() => setCompareMode((v) => !v)}
                  className="text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  {compareMode ? "Exit compare" : "Compare"}
                </button>
              </Tooltip>
            </div>

            <div className="mt-4 h-64 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
              <div className="absolute inset-0 opacity-60">
                <div className="absolute inset-0 flex flex-col justify-between py-3">
                  <div className="h-px bg-white/10" />
                  <div className="h-px bg-white/10" />
                  <div className="h-px bg-white/10" />
                  <div className="h-px bg-white/10" />
                </div>
              </div>
              <div className="absolute bottom-10 left-8 right-8 h-[2px] bg-[#00FFC6]/30" />
              <div className="absolute bottom-16 left-10 h-2 w-2 rounded-full bg-[#00FFC6]" />
              <div className="absolute bottom-28 left-1/3 h-2 w-2 rounded-full bg-[#00FFC6]" />
              <div className="absolute bottom-20 left-2/3 h-2 w-2 rounded-full bg-[#00FFC6]" />
              <div className="absolute bottom-36 right-10 h-2 w-2 rounded-full bg-[#00FFC6]" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Segment breakdown</p>
                <p className="text-xs text-[#B3B3B3] mt-1">UI preview</p>
              </div>
              <Tooltip label="Coming soon" placement="bottom">
                <button
                  type="button"
                  className="text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  Filter
                </button>
              </Tooltip>
            </div>

            <div className="divide-y divide-white/10">
              {(
                drawerTitle.toLowerCase().includes("conversion")
                  ? [
                      { label: "Saved after 1st listen", value: "38%", change: "+2%" },
                      { label: "Saved after 2–3 listens", value: "27%", change: "+1%" },
                      { label: "Rated track", value: "14%", change: "+1%" },
                      { label: "Followed artist", value: "12%", change: "0%" },
                      { label: "Shared externally", value: "9%", change: "-1%" },
                    ]
                  : drawerTitle.toLowerCase().includes("streams")
                  ? [
                      { label: "Home feed", value: "42%", change: "+2%" },
                      { label: "Search", value: "21%", change: "+1%" },
                      { label: "Playlists", value: "18%", change: "0%" },
                      { label: "Artist page", value: "12%", change: "+1%" },
                      { label: "External", value: "7%", change: "-1%" },
                    ]
                  : [
                      { label: "Release A", value: "31%", change: "+1%" },
                      { label: "Release B", value: "24%", change: "+2%" },
                      { label: "Release C", value: "18%", change: "0%" },
                      { label: "Release D", value: "15%", change: "-1%" },
                      { label: "Other", value: "12%", change: "0%" },
                    ]
              ).map((r) => (
                <div
                  key={r.label}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 truncate">{r.label}</p>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-[#00FFC6]/35"
                        style={{ width: r.value }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-white/90 tabular-nums">{r.value}</span>
                    <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-black/20 text-[#B3B3B3] tabular-nums">
                      {r.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">Notes</p>
            <p className="text-xs text-[#B3B3B3] mt-1">
              Later we’ll add export, comparisons, and real segment filters.
            </p>
          </div>
        </div>
      </AnalyticsDrawer>
    </div>
  );
}

export default function ArtistAnalyticsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#B3B3B3]">Loading analytics…</div>}>
      <ArtistAnalyticsPageInner />
    </Suspense>
  );
}
