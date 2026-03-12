"use client";

import PlaylistCard from "@/components/PlaylistCard";
import type { PlaylistCardDto } from "../_types/artistPageDto";

export default function ArtistPlaylistsSection({
  playlists,
}: {
  playlists: PlaylistCardDto[];
}) {
  return (
    <div className="w-full px-0 pb-4">
      <div className="flex items-end justify-between gap-4 mb-3">
        <h2 className="text-3xl font-bold text-white whitespace-nowrap">
          Artist <span className="text-[#00FFC6]">Playlists</span>
        </h2>
        <div className="min-w-[220px] text-right text-sm text-[#B3B3B3]">
          {playlists.length > 0 ? `${playlists.length} public` : ""}
        </div>
      </div>

      {playlists.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
          {playlists.map((pl) => (
            <div key={pl.id} className="shrink-0 w-[168px] snap-start">
              <PlaylistCard
                id={pl.id}
                title={pl.title}
                description={null}
                cover_url={pl.coverUrl}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-neutral-400 text-sm">No public playlists yet.</p>
        </div>
      )}
    </div>
  );
}
