"use client";

type Props = {
  discoveryMode: "development" | "performance";
  setDiscoveryMode: (mode: "development" | "performance") => void;
};

export default function DashboardHeroAndToggle({
  discoveryMode,
  setDiscoveryMode,
}: Props) {
  return (
    <>
      {/* Ambient Hero (UI-only) */}
      <div
        className="
          relative overflow-hidden
          -mx-4 sm:-mx-6 lg:-mx-8
          px-4 sm:px-6 lg:px-8
          pt-10
          pb-12
        "
      >
        {/* Layer 1: Grundgradient */}
        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-gradient-to-r
            from-[#0B1614]
            via-[#0B1614]
            to-[#06212A]
          "
        />

        {/* Layer 2: Radial Glow (oben rechts, subtil) */}
        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-[radial-gradient(90%_140%_at_80%_15%,rgba(0,255,198,0.22),transparent_60%)]
          "
        />

        {/* Layer 3: LANGER Bottom-Fade in Home-Background */}
        <div
          aria-hidden="true"
          className="
            absolute inset-x-0 bottom-0
            h-40
            bg-gradient-to-b
            from-transparent
            via-[#0B0B0D]/70
            to-[#0B0B0D]
          "
        />

        {/* Content layer */}
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                Welcome back
              </div>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-white/90 leading-tight">
                Discover new music today
              </div>
              <div className="mt-1 text-sm text-white/50">
                Development for feedback • Performance for proven tracks
              </div>
            </div>

            {/* decorative badge */}
            <div className="shrink-0 hidden sm:flex items-center gap-2 rounded-full border border-[#00FFC622] bg-black/20 px-3 py-1.5 backdrop-blur">
              <span className="inline-block h-2 w-2 rounded-full bg-[#00FFC6] shadow-[0_0_12px_rgba(0,255,198,0.6)]" />
              <span className="text-xs text-white/75">IMUSIC Discovery</span>
            </div>
          </div>

          {/* Discovery Toggle */}
          <div className="mt-6 flex items-center justify-center">
            <div className="inline-flex rounded-full border border-[#00FFC622] bg-black/25 p-1 backdrop-blur shadow-[0_0_22px_rgba(0,255,198,0.10)]">
              <button
                type="button"
                onClick={() => setDiscoveryMode("development")}
                className={[
                  "inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
                  discoveryMode === "development"
                    ? "bg-[#0B1614] text-white/90 border border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                    : "bg-transparent text-white/70 hover:text-white/90",
                ].join(" ")}
              >
                Development
              </button>

              <button
                type="button"
                onClick={() => setDiscoveryMode("performance")}
                className={[
                  "inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
                  discoveryMode === "performance"
                    ? "bg-[#0B1614] text-white/90 border border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                    : "bg-transparent text-white/70 hover:text-white/90",
                ].join(" ")}
              >
                Performance
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
