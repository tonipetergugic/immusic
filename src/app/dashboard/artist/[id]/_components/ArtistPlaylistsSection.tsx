"use client";

import PlaylistCard from "@/components/PlaylistCard";
import type { PlaylistCardDto } from "../_types/artistPageDto";

export default function ArtistPlaylistsSection({
  playlists,
}: {
  playlists: PlaylistCardDto[];
}) {
  return (
    <div className="w-full px-0 mt-12 pb-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-white">Playlists</h2>
        <div className="min-w-[220px] text-right text-sm text-[#B3B3B3]">
          {playlists.length > 0 ? `${playlists.length} public` : ""}
        </div>
      </div>

      {playlists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
          {playlists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              id={pl.id}
              title={pl.title}
              description={null}
              cover_url={pl.coverUrl}
            />
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
