import Link from "next/link";

type TabKey = "playlists" | "tracks" | "artists";

const tabs: { key: TabKey; label: string }[] = [
  { key: "playlists", label: "Playlists" },
  { key: "tracks", label: "Tracks" },
  { key: "artists", label: "Artists" },
];

export function LibraryV2Header({ currentTab }: { currentTab: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="
          relative overflow-hidden
          -mx-4 sm:-mx-6 lg:-mx-8
          px-4 sm:px-6 lg:px-8
          pt-10
          pb-16
        "
      >
        {/* Layer 1: Base gradient */}
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

        {/* Layer 2: Radial glow (subtle) */}
        <div
          aria-hidden="true"
          className="
            absolute inset-0
            bg-[radial-gradient(90%_140%_at_80%_15%,rgba(0,255,198,0.22),transparent_60%)]
          "
        />

        {/* Layer 3: Bottom fade */}
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
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Your Library</h1>
            <p className="text-sm text-neutral-400">
              Collect your favourite playlists, tracks and artists in one place.
            </p>
          </header>

          {/* Tabs (underline style like old Library) */}
          <div className="mt-10 border-b border-white/5">
            <nav className="flex gap-6 text-sm">
              {tabs.map((tab) => {
                const isActive = currentTab === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={`/dashboard/library?tab=${tab.key}`}
                    className={`pb-3 transition-colors ${
                      isActive
                        ? "text-white font-medium border-b-2 border-[#00FFC6]"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
