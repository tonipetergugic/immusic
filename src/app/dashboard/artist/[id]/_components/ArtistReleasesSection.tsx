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
    <div className="w-full px-0 mt-3 pb-4">
      <div className="flex items-end justify-between gap-4 mb-3">
        <h2 className="text-2xl font-semibold text-white">Releases</h2>
        <div className="min-w-[220px] text-right text-sm text-[#B3B3B3]">
          {releases.length > 0 ? `${releases.length} published` : ""}
        </div>
      </div>

      {releases.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
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
              <div key={rel.id} className="shrink-0 w-[150px] snap-start">
                <ReleaseCard releaseId={rel.id} data={cardData} />
              </div>
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
