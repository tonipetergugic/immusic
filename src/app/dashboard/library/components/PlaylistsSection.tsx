import PlaylistCard from "@/components/PlaylistCard";
import type { Playlist } from "@/types/database";

export function PlaylistsSection({ playlists }: { playlists: Playlist[] }) {
  return (
    <div className="px-6 pt-4 pb-10">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 sm:gap-3 items-start">
        {playlists.length > 0 ? (
          playlists.map((p) => (
            <PlaylistCard
              key={p.id}
              id={p.id}
              title={p.title}
              description={p.description ?? null}
              cover_url={p.cover_url ?? null}
            />
          ))
        ) : (
          <p className="text-sm text-neutral-400 col-span-full">No playlists found.</p>
        )}
      </div>
    </div>
  );
}
