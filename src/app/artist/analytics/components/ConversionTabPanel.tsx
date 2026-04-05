"use client";

import Image from "next/image";
import type { Range, TopConvertingTrackRow } from "../types";
import { getRangeLabel } from "../_lib/analyticsRangeLabel";

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

type Props = {
  activeRange: Range;
  topConvertingTracks: TopConvertingTrackRow[];
  savesCount: number;
  conversionPct: number;
};

export default function ConversionTabPanel({
  activeRange,
  topConvertingTracks,
  savesCount,
  conversionPct,
}: Props) {
  return (
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

          {topConvertingTracks.length === 0 ? (
            <div className="px-4 md:px-5 py-4 text-sm text-muted-foreground">
              Not enough listener data yet.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {topConvertingTracks.map((t, idx) => (
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
              {Number.isFinite(conversionPct)
                ? `${conversionPct.toFixed(1)}%`
                : "—"}
            </div>

            <div className="mt-4 border-t border-white/5 pt-4">
              <div className="text-sm text-muted-foreground mb-1">Saves</div>
              <div className="text-2xl font-medium">{formatInt(savesCount)}</div>
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
  );
}
