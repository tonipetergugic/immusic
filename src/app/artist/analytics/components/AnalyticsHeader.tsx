"use client";

import { BarChart3 } from "lucide-react";

type Range = "7d" | "28d" | "all";

interface AnalyticsHeaderProps {
  activeRange: Range;
  onRangeChange: (range: Range) => void;
}

export default function AnalyticsHeader({ activeRange, onRangeChange }: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
          <BarChart3 className="h-7 w-7 text-[#00FFC6]" />
          Artist Analytics
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onRangeChange("7d")}
          className={`px-3 py-2 rounded-xl border text-sm transition ${
            activeRange === "7d"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-white/5 border-white/10 text-[#B3B3B3] hover:bg-white/10"
          }`}
        >
          Last 7 days
        </button>
        <button
          onClick={() => onRangeChange("28d")}
          className={`px-3 py-2 rounded-xl border text-sm transition ${
            activeRange === "28d"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-white/5 border-white/10 text-[#B3B3B3] hover:bg-white/10"
          }`}
        >
          Last 28 days
        </button>
        <button
          onClick={() => onRangeChange("all")}
          className={`px-3 py-2 rounded-xl border text-sm transition ${
            activeRange === "all"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-white/5 border-white/10 text-[#B3B3B3] hover:bg-white/10"
          }`}
        >
          All time
        </button>
      </div>
    </div>
  );
}

