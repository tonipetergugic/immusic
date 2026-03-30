import Link from "next/link";

export function LibraryV2Header({ currentTab }: { currentTab: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="
          relative overflow-hidden
          -mx-4 sm:-mx-6 lg:-mx-8
          px-4 sm:px-6 lg:px-8
          pt-10
          pb-12
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
          <header className="flex min-h-[154px] flex-col justify-start gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Your <span className="text-[#00FFC6]">Library</span>
            </h1>
            <p className="text-sm text-neutral-400">
              Collect your favourite playlists, tracks, artists and releases in one place.
            </p>
          </header>
        </div>
      </div>
    </div>
  );
}
