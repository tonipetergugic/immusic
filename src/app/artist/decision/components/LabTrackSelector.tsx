import Link from "next/link";
import type { ArtistDecisionPayload } from "@/components/decision-center/types";

type LabTrackSelectorItem = {
  folderName: string;
  payload?: ArtistDecisionPayload;
  title?: string;
};

export function LabTrackSelector({
  items,
  selectedFolderName,
  pathname = "/artist/decision",
}: {
  items: LabTrackSelectorItem[];
  selectedFolderName: string;
  pathname?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Local test tracks
      </p>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = item.folderName === selectedFolderName;
          const title =
            item.title || item.payload?.track?.title || item.folderName;

          return (
            <Link
              key={item.folderName}
              href={{
                pathname,
                query: { track: item.folderName },
              }}
              className={[
                "rounded-2xl border px-4 py-3 text-left text-sm transition",
                isActive
                  ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                  : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/20 hover:bg-white/5",
              ].join(" ")}
            >
              <span className="line-clamp-2">{title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
