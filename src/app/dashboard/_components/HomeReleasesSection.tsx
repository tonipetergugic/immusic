"use client";

import ReleaseCard, { type ReleaseCardData } from "@/components/ReleaseCard";

type ReleaseLike = {
  id: string;
  title: string;
  cover_url?: string | null;
  release_type?: string | null;
  artist_id?: string | null;
  artist_name?: string | null;
};

type Props = {
  title: string;
  emptyText?: string;
  releaseIds: string[];
  releasesById: Record<string, ReleaseLike | undefined>;
  showWhenEmpty?: boolean;
  wrapperClassName?: string;
};

export default function HomeReleasesSection({
  title,
  emptyText = "No releases configured for Home yet.",
  releaseIds,
  releasesById,
  showWhenEmpty = true,
  wrapperClassName = "space-y-4",
}: Props) {
  if (!showWhenEmpty && releaseIds.length === 0) return null;

  return (
    <div className={wrapperClassName}>
      <h2 className="text-xl font-semibold">{title}</h2>

      {releaseIds.length === 0 ? (
        <p className="text-white/40">{emptyText}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pt-2 pb-3 -mx-4 px-4 snap-x snap-mandatory">
          {releaseIds.slice(0, 10).map((rid) => {
            const data = releasesById[rid] ?? null;
            return (
              <div key={rid} className="shrink-0 w-[150px] snap-start">
                <ReleaseCard
                  releaseId={rid}
                  data={
                    data
                      ? ({
                          id: data.id,
                          title: data.title,
                          cover_url: data.cover_url ?? null,
                          release_type: data.release_type ?? null,
                          artist_id: data.artist_id ?? null,
                          artist_name: data.artist_name ?? null,
                        } satisfies ReleaseCardData)
                      : null
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
