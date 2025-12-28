"use client";

const TABS = ["Overview", "Audience", "Tracks", "Conversion"] as const;
type Tab = (typeof TABS)[number];

export default function AnalyticsTabs({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
      {TABS.map((tab) => {
        const isActive = tab === value;

        return (
          <button
            key={tab}
            onClick={() => {
              onChange(tab);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              isActive
                ? "border-[#00FFC6] text-white"
                : "border-transparent text-[#B3B3B3] hover:text-white"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

