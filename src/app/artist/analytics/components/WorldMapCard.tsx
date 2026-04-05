"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const AudienceWorldMap = dynamic(() => import("./AudienceWorldMap"), { ssr: false });
import type { CountryListeners30dRow } from "../types";

function formatCountryLabel(codeLike: string | null | undefined) {
  const code = String(codeLike ?? "").trim().toUpperCase();
  if (!code) return "Unknown";

  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    if (code.length === 2) {
      return dn.of(code) ?? code;
    }
  } catch {
    // keep fallback
  }

  return code;
}

export default function WorldMapCard({
  items,
}: {
  items: CountryListeners30dRow[];
}) {
  const top = useMemo(() => {
    const getListeners = (r: CountryListeners30dRow) => Number(r.listeners_30d ?? 0);

    const total = (items || []).reduce((sum, r) => sum + getListeners(r), 0);
    const sorted = [...(items || [])]
      .sort((a, b) => getListeners(b) - getListeners(a))
      .slice(0, 12);

    return { total, sorted, getListeners };
  }, [items]);

  return (
    <section className="border-b border-white/10 pb-10">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
          Audience
        </div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Top countries
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Listeners · Last 28 days · Worldwide
        </p>
      </div>

      <div className="mt-8 grid min-w-0 gap-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <div className="min-w-0">
          <div className="grid grid-cols-[56px_minmax(0,1fr)_120px_96px] gap-4 border-b border-white/10 pb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
            <div>#</div>
            <div>Country</div>
            <div className="text-right">Listeners</div>
            <div className="text-right">Share</div>
          </div>

          <div className="divide-y divide-white/10">
            {top.sorted.length === 0 ? (
              <div className="py-6 text-sm text-white/55">No location data yet.</div>
            ) : (
              (() => {
                const seen = new Set<string>();
                const unique = top.sorted.filter((c) => {
                  const code = String(c.country_iso2 ?? "").trim().toUpperCase();
                  if (!code) return false;
                  if (seen.has(code)) return false;
                  seen.add(code);
                  return true;
                });

                return unique.map((c, index) => {
                  const listeners = top.getListeners(c);
                  const share = top.total > 0 ? (listeners / top.total) * 100 : 0;
                  const code = String(c.country_iso2 ?? "").trim().toUpperCase();
                  const pretty = formatCountryLabel(code);

                  return (
                    <div
                      key={code || `${pretty}-${index}`}
                      className="grid grid-cols-[56px_minmax(0,1fr)_120px_96px] gap-4 py-4"
                    >
                      <div className="text-sm text-white/40">{index + 1}</div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">
                          {pretty}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-white/35">
                          {code}
                        </div>
                      </div>

                      <div className="text-right text-sm text-white/88">
                        {listeners.toLocaleString("en-US")}
                      </div>

                      <div className="text-right text-sm text-white/55">
                        {share.toFixed(1)}%
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        <div className="min-w-0 xl:pl-2">
          <AudienceWorldMap items={items} />
        </div>
      </div>
    </section>
  );
}
