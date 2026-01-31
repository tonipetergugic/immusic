"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const AudienceWorldMap = dynamic(() => import("./AudienceWorldMap"), { ssr: false });
import type { CountryListeners30dRow } from "./ArtistAnalyticsClient";

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
      .slice(0, 5);

    return { total, sorted, getListeners };
  }, [items]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold">Listener locations (30d)</p>
          <p className="text-xs text-[#B3B3B3] mt-1">ISO2 • server-side</p>
        </div>
      </div>

      <AudienceWorldMap items={items} />

      <p className="text-xs text-[#B3B3B3] mt-4">Top locations (share of 30d listeners)</p>

      <div className="mt-4 space-y-2">
        {top.sorted.length === 0 && (
          <div className="text-xs text-[#B3B3B3]">No data yet.</div>
        )}

        {(() => {
          const seen = new Set<string>();
          const unique = top.sorted.filter((c) => {
            const code = String(c.country_iso2 ?? "").trim().toUpperCase();
            if (!code) return false;
            if (seen.has(code)) return false;
            seen.add(code);
            return true;
          });

          return unique.map((c) => {
          const listeners = top.getListeners(c);
          const share = top.total > 0 ? Math.round((listeners / top.total) * 100) : 0;
          const raw = String(c.country_iso2 ?? "").trim();
          const code = raw.toUpperCase();

          let pretty = code;
          try {
            const dn = new Intl.DisplayNames(["en"], { type: "region" });
            if (code.length === 2) {
              const name = dn.of(code);
              pretty = name ? `${name} (${code})` : code;
            }
          } catch {
            // ignore - keep fallback
          }

          return (
            <div
              key={code || pretty}
              className="space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#B3B3B3]">{pretty}</span>
                <span className="text-xs text-white/90">{share}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
                <div className="h-full bg-[#00FFC6]/35" style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        });
})()}
      </div>
    </div>
  );
}
