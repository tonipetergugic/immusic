"use client";

export default function AnalyticsHeader() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Artist Analytics
        </h1>
        <p className="text-sm text-[#B3B3B3]">
          UI preview — we’ll connect real data later.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
          Last 7 days
        </button>
        <button className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
          Last 28 days
        </button>
        <button className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
          All time
        </button>
      </div>
    </div>
  );
}

