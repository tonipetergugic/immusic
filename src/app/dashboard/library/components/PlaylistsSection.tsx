import PlaylistCard from "@/components/PlaylistCard";
import type { Playlist } from "@/types/database";

export function PlaylistsSection({ playlists }: { playlists: Playlist[] }) {
  return (
    <div className="pt-4 pb-10">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-start">
        {playlists.length > 0 ? (
          playlists.map((p, i) => (
            <PlaylistCard
              key={p.id}
              id={p.id}
              title={p.title}
              description={p.description ?? null}
              cover_url={p.cover_url ?? null}
              priority={i === 0}
            />
          ))
        ) : (
          <p className="text-sm text-neutral-400 col-span-full">No playlists found.</p>
        )}
      </div>
    </div>
  );
}
