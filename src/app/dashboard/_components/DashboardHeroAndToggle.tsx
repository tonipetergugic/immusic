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
      <div
        className="
          relative overflow-hidden
          -mx-4 sm:-mx-6 lg:-mx-8
          px-4 sm:px-6 lg:px-8
          pt-5 sm:pt-10
          pb-6 sm:pb-12
        "
      >
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

        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-[radial-gradient(90%_140%_at_80%_15%,rgba(0,255,198,0.22),transparent_60%)]
          "
        />

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

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/50 sm:text-[11px]">
                Welcome back
              </div>
              <div className="mt-1 text-[26px] font-semibold leading-[1.06] tracking-[-0.02em] text-white sm:text-4xl sm:leading-tight">
                <span className="text-[#00FFC6]">Discover</span> and rate new <span className="text-[#00FFC6]">music</span>
              </div>
              <div className="mt-2 text-[13px] leading-5 text-white/58 sm:mt-1 sm:text-sm sm:leading-5">
                <div>Development tracks are looking for feedback.</div>
                <div>Performance shows proven tracks that stood out.</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center sm:mt-7">
            <div className="inline-flex w-full max-w-md rounded-[18px] border border-[#00FFC622] bg-black/25 p-1 backdrop-blur shadow-[0_0_22px_rgba(0,255,198,0.10)] sm:w-auto sm:max-w-none sm:rounded-full sm:p-1">
              <button
                type="button"
                onClick={() => setDiscoveryMode("development")}
                className={[
                  "cursor-pointer inline-flex min-h-[42px] flex-1 items-center justify-center rounded-full border px-3.5 py-2.5 text-[14px] font-semibold transition-all duration-300 active:scale-[0.98] sm:min-h-0 sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm",
                  discoveryMode === "development"
                    ? "bg-[#0B1614] text-white/90 border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                    : "bg-transparent text-white/70 border-transparent hover:text-white/90",
                ].join(" ")}
              >
                Development
              </button>

              <button
                type="button"
                onClick={() => setDiscoveryMode("performance")}
                className={[
                  "cursor-pointer inline-flex min-h-[42px] flex-1 items-center justify-center rounded-full border px-3.5 py-2.5 text-[14px] font-semibold transition-all duration-300 active:scale-[0.98] sm:min-h-0 sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm",
                  discoveryMode === "performance"
                    ? "bg-[#0B1614] text-white/90 border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
                    : "bg-transparent text-white/70 border-transparent hover:text-white/90",
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
