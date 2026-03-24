import ReleaseCard from "@/components/ReleaseCard";

type LibraryReleaseItem = {
  id: string;
  title: string | null;
  coverUrl: string | null;
  releaseType: string | null;
  releaseDate: string | null;
  artistId: string | null;
  artistName: string | null;
};

export function ReleasesSection({
  releases,
}: {
  releases: LibraryReleaseItem[];
}) {
  if (releases.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111112] p-6">
        <h3 className="text-sm font-semibold text-white/80">
          No releases saved yet
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Saved albums, EPs and singles will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-10">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-start">
        {releases.map((release) => (
          <ReleaseCard
            key={release.id}
            releaseId={release.id}
            data={{
              id: release.id,
              title: release.title ?? "Untitled release",
              cover_url: release.coverUrl,
              release_type: release.releaseType,
              artist_id: release.artistId,
              artist_name: release.artistName ?? "Unknown artist",
            }}
          />
        ))}
      </div>
    </div>
  );
}
