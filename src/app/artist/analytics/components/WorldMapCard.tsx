"use client";

import { useState } from "react";

const mockCountries = [
  { country: "Germany", share: 28 },
  { country: "United Kingdom", share: 14 },
  { country: "Netherlands", share: 11 },
  { country: "USA", share: 9 },
  { country: "Spain", share: 7 },
];

export default function WorldMapCard() {
  const [mode, setMode] = useState<"Countries" | "Regions">("Countries");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold">Listener locations</p>
          <p className="text-xs text-[#B3B3B3] mt-1">
            World view preview — we’ll add a real map later.
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

      <div className="h-56 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
        {/* soft vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,198,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.06),transparent_45%)]" />

        {/* globe placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-44 h-44 rounded-full border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(0,255,198,0.12)] relative overflow-hidden">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_45%)]" />
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_60%_70%,rgba(0,255,198,0.35),transparent_55%)]" />
            <div className="absolute left-[-40%] top-[-10%] w-[180%] h-[120%] border border-white/10 rounded-full" />
          </div>
        </div>

        {/* pins */}
        <div className="absolute left-8 top-12 h-2 w-2 rounded-full bg-[#00FFC6] shadow-[0_0_18px_rgba(0,255,198,0.55)]" />
        <div className="absolute left-1/2 top-16 h-2 w-2 rounded-full bg-[#00FFC6] shadow-[0_0_18px_rgba(0,255,198,0.55)]" />
        <div className="absolute right-10 top-24 h-2 w-2 rounded-full bg-[#00FFC6] shadow-[0_0_18px_rgba(0,255,198,0.55)]" />
        <div className="absolute left-1/3 bottom-10 h-2 w-2 rounded-full bg-[#00FFC6] shadow-[0_0_18px_rgba(0,255,198,0.55)]" />

        {/* overlay label */}
        <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <p className="text-xs text-white/90">Top regions</p>
          <p className="text-[11px] text-[#B3B3B3] mt-0.5">UI preview</p>
        </div>
      </div>

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

