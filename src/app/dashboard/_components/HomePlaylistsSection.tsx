"use client";

import PlaylistCard from "@/components/PlaylistCard";

type PlaylistLike = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
};

type Props = {
  title: string;
  emptyText?: string;
  playlistIds: string[];
  playlistsById: Record<string, PlaylistLike | undefined>;
  showWhenEmpty?: boolean;
  wrapperClassName?: string;
};

export default function HomePlaylistsSection({
  title,
  emptyText = "No playlists configured for Home yet.",
  playlistIds,
  playlistsById,
  showWhenEmpty = true,
  wrapperClassName = "space-y-4",
}: Props) {
  if (!showWhenEmpty && playlistIds.length === 0) return null;

  return (
    <div className={wrapperClassName}>
      <h2 className="text-xl font-semibold">{title}</h2>

      {playlistIds.length === 0 ? (
        <p className="text-white/40">{emptyText}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
          {playlistIds.slice(0, 10).map((pid, i) => {
            const pl = playlistsById[pid];

            if (!pl) {
              return (
                <div
                  key={pid}
                  className="shrink-0 w-[150px] snap-start bg-[#111112] p-3 rounded-xl border border-transparent"
                >
                  <div className="w-full aspect-square rounded-xl bg-white/10" />
                  <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
                  <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
                </div>
              );
            }

            return (
              <div key={pid} className="shrink-0 w-[150px] snap-start">
                <PlaylistCard
                  id={pl.id}
                  title={pl.title}
                  description={pl.description}
                  cover_url={pl.cover_url}
                  priority={i === 0}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
