import PlaylistCard from "@/components/PlaylistCard";
import type { Playlist } from "@/types/database";

export function PlaylistsSection({ playlists }: { playlists: Playlist[] }) {
  return (
    <div className="px-6 pt-4 pb-10">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 sm:gap-3 items-start">
        {playlists.length > 0 ? (
          playlists.map((p) => (
            <div key={p.id}>
              <PlaylistCard
                id={p.id}
                title={p.title}
                description={p.description}
                cover_url={(p as any).cover_url ?? null}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-400 col-span-full">No playlists found.</p>
        )}
      </div>
    </div>
  );
}
