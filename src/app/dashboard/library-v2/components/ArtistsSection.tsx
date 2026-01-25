import ArtistCard from "@/components/ArtistCard";
import type { Profile } from "@/types/database";

export function ArtistsSection({ artists }: { artists: Profile[] }) {
  return (
    <div className="px-6 pt-4 pb-10">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 sm:gap-3 items-start">
        {artists.length > 0 ? (
          artists.map((a) => (
            <div key={a.id}>
              <ArtistCard
                artistId={a.id}
                displayName={a.display_name}
                avatarUrl={a.avatar_url}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-400 col-span-full">No artists found.</p>
        )}
      </div>
    </div>
  );
}
