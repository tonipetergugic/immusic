"use client";

import ReleaseCard, { type ReleaseCardData } from "@/components/ReleaseCard";
import type { ReleaseCardDto } from "../_types/artistPageDto";

export default function ArtistReleasesSection({
  releases,
  artistId,
  artistName,
}: {
  releases: ReleaseCardDto[];
  artistId: string;
  artistName: string;
}) {
  return (
    <div className="w-full px-0 mt-10 pb-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-white">Releases</h2>
        <div className="min-w-[220px] text-right text-sm text-[#B3B3B3]">
          {releases.length > 0 ? `${releases.length} published` : ""}
        </div>
      </div>

      {releases.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
          {releases.map((rel) => {
            const cardData: ReleaseCardData = {
              id: rel.id,
              title: rel.title,
              cover_url: rel.coverUrl,
              release_type: rel.releaseType ?? null,
              artist_id: artistId,
              artist_name: artistName,
            };

            return (
              <ReleaseCard key={rel.id} releaseId={rel.id} data={cardData} />
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-neutral-400 text-sm">No releases yet.</p>
        </div>
      )}
    </div>
  );
}
