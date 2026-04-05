"use client";

import Image from "next/image";
import type { TopTrackRow } from "../types";

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

type Props = {
  topTracks: TopTrackRow[];
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
};

export default function TopTracksPanel({
  topTracks,
  selectedTrackId,
  onSelectTrack,
}: Props) {
  return (
    <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold">Top tracks</p>

          <div className="ml-auto flex items-center gap-6 text-xs text-[#B3B3B3]">
            <div className="w-14 text-right">Streams</div>
            <div className="w-14 text-right">Listeners</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        {topTracks.length === 0 && (
          <div className="px-4 md:px-5 py-3 text-xs text-[#B3B3B3]">No data yet.</div>
        )}

        {topTracks.map((t, idx) => (
          <div
            key={t.track_id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectTrack(t.track_id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectTrack(t.track_id);
            }}
            className={[
              "cursor-pointer px-4 md:px-5 py-3 flex items-center gap-4 transition",
              selectedTrackId === t.track_id ? "bg-white/10" : "hover:bg-white/5",
            ].join(" ")}
          >
            <div className="w-10 text-xs text-[#B3B3B3]">{idx + 1}</div>

            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative h-10 w-10 rounded-md bg-white/10 overflow-hidden shrink-0">
                {t.cover_url ? (
                  <Image
                    src={t.cover_url}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.title}</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <div className="w-14 text-right text-sm text-white/90 tabular-nums">
                {formatInt(t.streams)}
              </div>
              <div className="w-14 text-right text-sm text-[#00FFC6] tabular-nums">
                {formatInt(t.unique_listeners)}
              </div>
            </div>

            <div className="md:hidden text-sm text-[#00FFC6] tabular-nums">
              {formatInt(t.streams)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
