"use client";

import { useState } from "react";
import AudienceWorldMap from "./AudienceWorldMap";

const mockCountries = [
  { country: "Germany", share: 28 },
  { country: "United Kingdom", share: 14 },
  { country: "Netherlands", share: 11 },
  { country: "USA", share: 9 },
  { country: "Spain", share: 7 },
];

export default function WorldMapCard({ artistId }: { artistId: string }) {
  const [mode, setMode] = useState<"Countries" | "Regions">("Countries");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold">Listener locations</p>
          <p className="text-xs text-[#B3B3B3] mt-1">
            World view preview — we'll add a real map later.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            onClick={() => setMode("Countries")}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${
              mode === "Countries"
                ? "bg-white/10 text-white"
                : "text-[#B3B3B3] hover:text-white"
            }`}
          >
            Countries
          </button>
          <button
            onClick={() => setMode("Regions")}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${
              mode === "Regions"
                ? "bg-white/10 text-white"
                : "text-[#B3B3B3] hover:text-white"
            }`}
          >
            Regions
          </button>
        </div>
      </div>

      <AudienceWorldMap artistId={artistId} />

      <p className="text-xs text-[#B3B3B3] mt-4">
        Tip: Pins show where your listeners are coming from (UI preview).
      </p>

      <div className="mt-4 space-y-2">
        {mockCountries.map((c) => (
          <div key={c.country} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#B3B3B3]">
                {mode === "Countries" ? c.country : `${c.country} Region`}
              </span>
              <span className="text-xs text-white/90">{c.share}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className="h-full bg-[#00FFC6]/35"
                style={{ width: `${c.share}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

