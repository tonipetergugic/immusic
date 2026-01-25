import Link from "next/link";

type Props = { currentTab: string };

const tabs = [
  { key: "playlists", label: "Playlists" },
  { key: "tracks", label: "Tracks" },
  { key: "artists", label: "Artists" },
];

export function LibraryV2Tabs({ currentTab }: Props) {
  return (
    <div className="px-6 pt-6">
      <div className="flex items-center gap-2">
        {tabs.map((t) => {
          const active = currentTab === t.key;
          return (
            <Link
              key={t.key}
              href={`/dashboard/library-v2?tab=${t.key}`}
              className={[
                "px-3 py-1.5 rounded-full text-sm transition-colors",
                active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
