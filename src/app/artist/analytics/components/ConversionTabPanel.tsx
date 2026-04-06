"use client";

import Image from "next/image";
import type { Range, TopConvertingTrackRow } from "../types";
import { getRangeLabel } from "../_lib/analyticsRangeLabel";

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

function formatPercentWhole(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
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
    <section className="pb-10">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Save performance
        </h2>
        <p className="mt-2 text-sm text-white/55">
          {(() => {
            const r = getRangeLabel(activeRange);
            const label = r.badge ?? r.subtitle ?? String(activeRange);
            return <>Saves vs listeners ({label})</>;
          })()}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-end gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-[24px] font-semibold tracking-tight text-white">
                Top save ratio tracks
              </h3>
            </div>

            <div className="ml-auto hidden items-center gap-5 pr-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45 xl:flex">
              <div className="w-16 text-right">Saves</div>
              <div className="w-16 text-right">Listeners</div>
              <div className="w-16 text-right">Conv.</div>
            </div>
          </div>

          {topConvertingTracks.length === 0 ? (
            <div className="py-4 text-sm text-white/55">
              Not enough listener data yet.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {topConvertingTracks.map((t, idx) => (
                <div
                  key={t.track_id}
                  className="flex items-center gap-4 px-4 py-4 transition hover:bg-white/[0.025]"
                >
                  <div className="w-10 text-xs text-white/40">{idx + 1}</div>

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md bg-white/10 shrink-0">
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
                      <p className="truncate text-sm font-medium text-white">
                        {t.title}
                      </p>
                    </div>
                  </div>

                  <div className="hidden items-center gap-5 pr-2 xl:flex">
                    <div className="w-16 text-right text-sm tabular-nums text-white/88">
                      {formatInt(t.saves)}
                    </div>
                    <div className="w-16 text-right text-sm tabular-nums text-white/88">
                      {formatInt(t.listeners)}
                    </div>
                    <div className="w-16 text-right text-sm tabular-nums text-[#00FFC6]">
                      {formatPercentWhole(t.conversion_pct)}
                    </div>
                  </div>

                  <div className="text-sm tabular-nums text-[#00FFC6] xl:hidden">
                    {formatPercentWhole(t.conversion_pct)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8 xl:border-l xl:border-white/10 xl:pl-8">
          <section className="border-b border-white/10 pb-8">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Summary
            </div>
            <div className="mt-4">
              <p className="text-6xl font-semibold tracking-[-0.04em] text-white tabular-nums leading-none">
                {formatPercentWhole(conversionPct)}
              </p>
              <p className="mt-3 text-lg font-medium tracking-tight text-white/55">
                save ratio
              </p>
            </div>

            <div className="mt-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
                Saves
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                {formatInt(savesCount)}
              </p>
            </div>
          </section>

          <section>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Guide
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
              How to read this
            </h3>

            <div className="mt-5 divide-y divide-white/10 border-t border-white/10">
              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-4">
                <div className="text-sm font-medium text-white">&lt; 5%</div>
                <div className="text-sm text-white/55">Low save rate</div>
              </div>

              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-4">
                <div className="text-sm font-medium text-white">5–10%</div>
                <div className="text-sm text-white/55">Healthy save rate</div>
              </div>

              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-4">
                <div className="text-sm font-medium text-white">&gt; 10%</div>
                <div className="text-sm text-white/55">Very strong save rate</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
