"use client";

import Image from "next/image";
import type { TopTrackRow } from "../types";

function formatInt(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

function formatListeningTime(seconds: number) {
  const minutes = Math.round((seconds ?? 0) / 60);
  return `${formatInt(minutes)} min`;
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
    <section className="min-w-0">
      <div className="border-b border-white/10 pb-4">
        <div className="flex items-end gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Top tracks
            </h2>
          </div>

          <div className="ml-auto hidden items-center gap-5 pr-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/45 xl:flex">
            <div className="w-16 text-right">Streams</div>
            <div className="w-16 text-right">Listeners</div>
            <div className="w-16 text-right">Rating</div>
            <div className="w-20 text-right">Time</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        {topTracks.length === 0 && (
          <div className="py-4 text-sm text-white/55">No data yet.</div>
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
              "cursor-pointer flex items-center gap-4 px-4 py-4 transition",
              selectedTrackId === t.track_id ? "bg-white/[0.04]" : "hover:bg-white/[0.025]",
            ].join(" ")}
          >
            <div className="w-10 text-xs text-white/40">{idx + 1}</div>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-md bg-white/10 shrink-0">
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
                <p className="truncate text-sm font-medium text-white">{t.title}</p>
              </div>
            </div>

            <div className="hidden items-center gap-5 pr-2 xl:flex">
              <div className="w-16 text-right text-sm tabular-nums text-white/88">
                {formatInt(t.streams)}
              </div>
              <div className="w-16 text-right text-sm tabular-nums text-[#00FFC6]">
                {formatInt(t.unique_listeners)}
              </div>
              <div className="w-16 text-right text-sm tabular-nums text-white/80">
                {t.rating_avg === null ? "—" : t.rating_avg.toFixed(2)}
              </div>
              <div className="w-20 text-right text-sm tabular-nums text-white/60">
                {formatListeningTime(t.listened_seconds)}
              </div>
            </div>

            <div className="text-sm tabular-nums text-[#00FFC6] xl:hidden">
              {formatInt(t.streams)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
